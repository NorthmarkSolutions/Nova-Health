import React, { useState, useMemo } from 'react';
import { PageHeader, FilterPills } from '../../../components/shared';
import { Search, Plus, CheckCircle2, UserPlus, X, Check, RefreshCw, MapPin, Sparkles } from 'lucide-react';
import { getHospitalStaff } from '../../admin/setup/organization/hospitalStaffStore';

interface Props {
  onNavigateTab: (tab: string) => void;
}

interface StaffRow {
  id: string;
  initials: string;
  name: string;
  code: string;
  role: string;
  roleCategory: 'Pathologist' | 'Technologist' | 'Phlebotomist';
  section: string;
  shift: string;
  competency: string;
  isCompetencyExpiring?: boolean;
  status: 'On duty' | 'On call' | 'Off today' | 'On leave';
}

interface PendingRequest {
  id: string;
  name: string;
  title: string;
  detail: string;
}

export const LabAdminStaffView: React.FC<Props> = ({ onNavigateTab }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // Multi-tab modal state
  const [modalTab, setModalTab] = useState<'personal' | 'professional' | 'stationing' | 'documents'>('personal');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Tab 1: Personal & Contact
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [staffStatus, setStaffStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED'>('ACTIVE');

  // Tab 2: Role & Credentials
  const [labRole, setLabRole] = useState('Lab Technologist');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [labSection, setLabSection] = useState('Biochemistry');

  // Tab 3: Lab Stationing
  const [shiftName, setShiftName] = useState('Morning 07–15');
  const [benchStation, setBenchStation] = useState('');
  const [competencyLevel, setCompetencyLevel] = useState('DMLT');

  // Tab 4: Compliance
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [blsValidity, setBlsValidity] = useState('');
  const [nablTraining, setNablTraining] = useState(false);

  const hospitalStaffPool = useMemo(() => getHospitalStaff(), []);

  const generateEmployeeCode = (role: string) => {
    const prefix = role.includes('Pathologist') ? 'PATH' : role.includes('Phlebotomist') ? 'PHLE' : 'TECH';
    return `EMP-L-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const liveCompletion = useMemo(() => {
    let score = 10;
    if (fullName) score += 15;
    if (employeeCode) score += 10;
    if (phone) score += 10;
    if (email) score += 10;
    if (labRole) score += 10;
    if (designation) score += 10;
    if (qualification) score += 10;
    if (shiftName) score += 10;
    if (aadhaarNumber || blsValidity) score += 5;
    return Math.min(100, score);
  }, [fullName, employeeCode, phone, email, labRole, designation, qualification, shiftName, aadhaarNumber, blsValidity]);

  const handleSelectExistingStaff = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedStaffId(id);
    const s = hospitalStaffPool.find((x) => x.id === id);
    if (!s) return;
    setFullName(s.fullName || '');
    setEmployeeCode(s.employeeCode || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setGender((s as any).gender || 'Male');
    setDesignation(s.designation || '');
    setQualification(s.qualification || '');
    setLabRole('Lab Technologist');
  };

  const resetModalForm = () => {
    setModalTab('personal');
    setSelectedStaffId('');
    setFullName(''); setEmployeeCode(''); setGender('Male'); setDob('');
    setBloodGroup('O+'); setJoiningDate(new Date().toISOString().slice(0, 10));
    setAddressStreet(''); setAddressCity(''); setAddressState(''); setAddressPincode('');
    setPhone(''); setEmail(''); setEmergencyContact(''); setStaffStatus('ACTIVE');
    setLabRole('Lab Technologist'); setDesignation(''); setQualification(''); setLicenseNumber('');
    setLabSection('Biochemistry'); setShiftName('Morning 07–15'); setBenchStation('');
    setCompetencyLevel('DMLT'); setAadhaarNumber(''); setBlsValidity(''); setNablTraining(false);
  };

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([
    {
      id: 'pr-1',
      name: 'Vikram Rao',
      title: 'Leave · 3–4 Oct (2 days)',
      detail: 'Personal · cover: Pooja Sharma',
    },
    {
      id: 'pr-2',
      name: 'Imran Shaikh',
      title: 'Shift swap · Night 2 Oct → Evening',
      detail: 'With Pooja Sharma · both agreed',
    },
  ]);

  const [staffList, setStaffList] = useState<StaffRow[]>([
    {
      id: 's-1',
      initials: 'KM',
      name: 'Dr. Kavitha Menon',
      code: 'EMP-L-0102',
      role: 'Consultant Pathologist',
      roleCategory: 'Pathologist',
      section: 'All sections',
      shift: 'Day 08–16',
      competency: 'MCI reg. valid · Mar 2029',
      status: 'On duty',
    },
    {
      id: 's-2',
      initials: 'SR',
      name: 'Dr. Sanjay Rao',
      code: 'EMP-L-0107',
      role: 'Hematopathologist',
      roleCategory: 'Pathologist',
      section: 'Hematology',
      shift: 'On call',
      competency: 'MCI reg. valid · Jan 2028',
      status: 'On call',
    },
    {
      id: 's-3',
      initials: 'AV',
      name: 'Anjali Verma',
      code: 'EMP-L-0214',
      role: 'Sr. Lab Technologist',
      roleCategory: 'Technologist',
      section: 'Bench 2 · Hem & Chem',
      shift: 'Morning 07–15',
      competency: 'DMLT · NABL trained',
      status: 'On duty',
    },
    {
      id: 's-4',
      initials: 'VR',
      name: 'Vikram Rao',
      code: 'EMP-L-0221',
      role: 'Lab Technologist',
      roleCategory: 'Technologist',
      section: 'Chemistry',
      shift: 'Morning 07–15',
      competency: 'Competency due 12 Oct',
      isCompetencyExpiring: true,
      status: 'On duty',
    },
    {
      id: 's-5',
      initials: 'PS',
      name: 'Pooja Sharma',
      code: 'EMP-L-0230',
      role: 'Lab Technologist',
      roleCategory: 'Technologist',
      section: 'Immunoassay',
      shift: 'Evening 15–23',
      competency: 'BMLT',
      status: 'Off today',
    },
    {
      id: 's-6',
      initials: 'IS',
      name: 'Imran Shaikh',
      code: 'EMP-L-0233',
      role: 'Lab Technologist',
      roleCategory: 'Technologist',
      section: 'Blood gas / ER',
      shift: 'Night 23–07',
      competency: 'BMLT',
      status: 'Off today',
    },
    {
      id: 's-7',
      initials: 'NP',
      name: 'Neha Pillai',
      code: 'EMP-L-0301',
      role: 'Phlebotomist',
      roleCategory: 'Phlebotomist',
      section: 'OPD collection',
      shift: 'Morning 07–15',
      competency: 'BLS valid · Feb 2027',
      status: 'On duty',
    },
    {
      id: 's-8',
      initials: 'AK',
      name: 'Arjun Kapoor',
      code: 'EMP-L-0305',
      role: 'Phlebotomist',
      roleCategory: 'Phlebotomist',
      section: 'Ward rounds',
      shift: 'Morning 07–15',
      competency: 'BLS expires 18 Oct',
      isCompetencyExpiring: true,
      status: 'On duty',
    },
    {
      id: 's-9',
      initials: 'RD',
      name: 'Ritu Das',
      code: 'EMP-L-0312',
      role: 'Lab Technologist',
      roleCategory: 'Technologist',
      section: 'Hematology',
      shift: '—',
      competency: '—',
      status: 'On leave',
    },
  ]);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApproveRequest = (id: string, name: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    showNotice(`Approved request for ${name}. Duty schedule updated.`);
  };

  const handleRejectRequest = (id: string, name: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    showNotice(`Rejected request for ${name}.`);
  };

  const handleSendReminders = () => {
    showNotice('Automated credential expiry notifications sent via email and HMS alert.');
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const parts = fullName.trim().split(' ');
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : fullName.slice(0, 2).toUpperCase();
    const roleCategory: StaffRow['roleCategory'] = labRole.includes('Pathologist') ? 'Pathologist' : labRole.includes('Phlebotomist') ? 'Phlebotomist' : 'Technologist';

    const newStaff: StaffRow = {
      id: `s-${Date.now()}`,
      initials,
      name: fullName.trim(),
      code: employeeCode.trim().toUpperCase() || generateEmployeeCode(labRole),
      role: designation || labRole,
      roleCategory,
      section: labSection,
      shift: shiftName,
      competency: qualification ? `${competencyLevel} · ${qualification}` : 'Certified · Assessment pending',
      status: staffStatus === 'ACTIVE' ? 'On duty' : staffStatus === 'ON_LEAVE' ? 'On leave' : 'Off today',
    };

    setStaffList((prev) => [newStaff, ...prev]);
    setShowAddStaffModal(false);
    resetModalForm();
    showNotice(`${fullName.trim()} registered in Diagnostic Lab staff directory.`);
  };

  const filterPillItems = [
    { id: 'all', label: 'All', count: 14 },
    { id: 'Pathologist', label: 'Pathologists', count: 2 },
    { id: 'Technologist', label: 'Technologists', count: 8 },
    { id: 'Phlebotomist', label: 'Phlebotomists', count: 4 },
    { id: 'expiring', label: 'Expiring credentials', count: 2, tone: 'warning' as const },
  ];

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (activeFilter === 'expiring' && !s.isCompetencyExpiring) return false;
      if (activeFilter !== 'all' && activeFilter !== 'expiring' && s.roleCategory !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffList, activeFilter, searchQuery]);

  const statusColors: Record<string, { bg: string; fg: string }> = {
    'On duty': { bg: '#F0FDF4', fg: '#15803D' },
    'On call': { bg: '#F3F4F6', fg: '#374151' },
    'Off today': { bg: '#F3F4F6', fg: '#374151' },
    'On leave': { bg: '#FFFBEB', fg: '#B45309' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Staff & Roster"
        description="Everyone working in the lab: technicians, pathologists and phlebotomists, with their licences and competencies."
      >
        <button
          type="button"
          onClick={() => showNotice('Exported staff directory to CSV.')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => setShowAddStaffModal(true)}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #2563EB',
            backgroundColor: '#2563EB',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          Add staff member
        </button>
      </PageHeader>

      {/* 4 KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Total staff</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>14</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>2 pathologists · 8 technologists · 4 phlebotomists</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>On duty now</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#F0FDF4', color: '#15803D' }}>
              Morning
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>9</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>2 on call</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>On leave today</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>1</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Ritu Das · till 2 Oct</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Pending requests</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#FFFBEB', color: '#B45309' }}>
              Action
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B45309' }}>
              {pendingRequests.length}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>leave and shift swap</span>
          </div>
        </div>
      </section>

      {/* Main Split Layout: Directory (left) + Side Cards (right) */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left Directory Card */}
        <div
          style={{
            flex: '999 1 640px',
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Staff directory</h2>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Sorted by role</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '36px',
                  padding: '0 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  minWidth: '220px',
                  color: '#6B7280',
                  fontSize: '13px',
                }}
              >
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Name, ID or section"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '13px',
                    backgroundColor: 'transparent',
                  }}
                />
              </div>
            </div>

            <FilterPills
              items={filterPillItems}
              activeId={activeFilter}
              onSelect={setActiveFilter}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '860px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.1fr) 116px minmax(0,1fr) 92px 44px',
                  gap: '12px',
                  alignItems: 'center',
                  height: '44px',
                  padding: '0 20px',
                  backgroundColor: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.02em',
                }}
              >
                <span>NAME · ID</span>
                <span>ROLE · SECTION</span>
                <span>SHIFT TODAY</span>
                <span>LICENCE · COMPETENCY</span>
                <span>STATUS</span>
                <span style={{ textAlign: 'right' }} />
              </div>

              {filteredStaff.map((s) => {
                const sc = statusColors[s.status] || statusColors['On duty'];

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.1fr) 116px minmax(0,1fr) 92px 44px',
                      gap: '12px',
                      alignItems: 'center',
                      minHeight: '64px',
                      padding: '8px 20px',
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    {/* Name & ID */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#F3F4F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          flexShrink: 0,
                          color: '#374151',
                        }}
                      >
                        {s.initials}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-mono, monospace)' }}>
                          {s.code}
                        </span>
                      </div>
                    </div>

                    {/* Role & Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{s.role}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{s.section}</span>
                    </div>

                    {/* Shift */}
                    <span style={{ fontSize: '14px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                      {s.shift}
                    </span>

                    {/* Competency / Licence */}
                    <span
                      style={{
                        fontSize: '13px',
                        color: s.isCompetencyExpiring ? '#B45309' : '#6B7280',
                        fontWeight: s.isCompetencyExpiring ? 600 : 400,
                      }}
                    >
                      {s.competency}
                    </span>

                    {/* Status */}
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        backgroundColor: sc.bg,
                        color: sc.fg,
                      }}
                    >
                      {s.status}
                    </span>

                    {/* Action */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        type="button"
                        style={{
                          flexShrink: 0,
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#FFFFFF',
                          color: '#6B7280',
                          fontSize: '16px',
                          cursor: 'pointer',
                        }}
                      >
                        ⋯
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 16px', fontSize: '13px', color: '#6B7280' }}>
            <span>Showing {filteredStaff.length} of 14</span>
            <span>1 / 2</span>
          </div>
        </div>

        {/* Right Stack: Pending Requests + Credentials Expiring */}
        <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pending Requests Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Pending requests</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Approve before the roster is published</span>
            </div>

            {pendingRequests.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                No pending requests. All shift and leave requests resolved.
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{req.name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', color: '#111827' }}>{req.title}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{req.detail}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleRejectRequest(req.id, req.name)}
                      style={{
                        whiteSpace: 'nowrap',
                        height: '32px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#B91C1C',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveRequest(req.id, req.name)}
                      style={{
                        whiteSpace: 'nowrap',
                        height: '32px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid #2563EB',
                        backgroundColor: '#2563EB',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Credentials Expiring Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Credentials expiring</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Next 30 days</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '48px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Arjun Kapoor</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>BLS certification</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#B45309' }}>
                18 Oct
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '48px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Vikram Rao</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Chemistry competency assessment</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#B45309' }}>
                12 Oct
              </span>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSendReminders}
                style={{
                  whiteSpace: 'nowrap',
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#111827',
                  cursor: 'pointer',
                }}
              >
                Send reminders
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── RICH MULTI-TAB ADD STAFF MODAL ── */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddStaffModal(false); resetModalForm(); } }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                  <UserPlus size={22} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Register New Lab Staff Member</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>Configure credentials, lab section, shift window, and compliance parameters.</p>
                </div>
              </div>
              <button type="button" onClick={() => { setShowAddStaffModal(false); resetModalForm(); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', borderRadius: '6px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Profile Completion Bar — compact single row */}
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: liveCompletion >= 90 ? '#f0fdf4' : '#fffbeb',
                borderRadius: '10px',
                border: `1px solid ${liveCompletion >= 90 ? '#bbf7d0' : '#fde68a'}`,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: liveCompletion >= 90 ? '#15803d' : '#92400e', whiteSpace: 'nowrap' }}>
                {liveCompletion}% complete
              </span>
              <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${liveCompletion}%`, height: '100%', backgroundColor: liveCompletion >= 90 ? '#10b981' : '#f59e0b', borderRadius: '999px', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                backgroundColor: liveCompletion >= 90 ? '#dcfce7' : '#fef3c7',
                color: liveCompletion >= 90 ? '#166534' : '#b45309',
                border: `1px solid ${liveCompletion >= 90 ? '#86efac' : '#fcd34d'}`,
                whiteSpace: 'nowrap' }}>
                {liveCompletion >= 90 ? '✓ Ready' : `+${100 - liveCompletion}% remaining`}
              </span>
            </div>

            {/* Hospital Staff Pool Picker — compact */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Populate from hospital pool:</span>
              <select
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                value={selectedStaffId}
                onChange={handleSelectExistingStaff}
              >
                <option value="">— Or fill new staff details below —</option>
                {hospitalStaffPool.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.employeeCode} · {s.designation})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: '#2563EB', whiteSpace: 'nowrap', fontWeight: 600 }}>Optional</span>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px', marginBottom: '20px', overflowX: 'auto' }}>
              {[
                { id: 'personal', label: '1. Personal & Contact', done: !!(fullName && phone && email) },
                { id: 'professional', label: '2. Role & Credentials', done: !!qualification },
                { id: 'stationing', label: '3. Lab Stationing', done: !!shiftName },
                { id: 'documents', label: '4. Compliance & Docs', done: !!(aadhaarNumber || blsValidity) },
              ].map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setModalTab(t.id as any)}
                  style={{
                    padding: '7px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: modalTab === t.id ? '#2563EB' : '#F3F4F6',
                    color: modalTab === t.id ? '#FFFFFF' : '#6B7280',
                    display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                  }}
                >
                  <span>{t.label}</span>
                  {t.done && <Check size={12} />}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TAB 1: PERSONAL & CONTACT */}
              {modalTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Suresh Nair" required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employee Code <span style={{ color: '#ef4444' }}>*</span></label>
                        <button type="button" onClick={() => setEmployeeCode(generateEmployeeCode(labRole))}
                          style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <RefreshCw size={10} /> Auto-Generate
                        </button>
                      </div>
                      <input className="form-input" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())} placeholder="e.g. EMP-L-TECH-4201" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                    {[{label:'Gender',el:<select className="form-select" value={gender} onChange={(e)=>setGender(e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select>},
                      {label:'Date of Birth',el:<input type="date" className="form-input" value={dob} onChange={(e)=>setDob(e.target.value)} />},
                      {label:'Blood Group',el:<select className="form-select" value={bloodGroup} onChange={(e)=>setBloodGroup(e.target.value)}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg=><option key={bg}>{bg}</option>)}</select>},
                      {label:'Date of Joining',el:<input type="date" className="form-input" value={joiningDate} onChange={(e)=>setJoiningDate(e.target.value)} />},
                    ].map(({label,el})=>(
                      <div key={label} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>{label}</label>
                        {el}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} color="#2563EB" /> Residential &amp; Communication Address
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '12px' }}>Street Address</label>
                      <input className="form-input" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="e.g. 42 Medical Enclave, Sector 12" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div><label className="form-label" style={{ fontSize: '12px' }}>City</label><input className="form-input" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="e.g. New Delhi" /></div>
                      <div><label className="form-label" style={{ fontSize: '12px' }}>State</label><input className="form-input" value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="e.g. Delhi" /></div>
                      <div><label className="form-label" style={{ fontSize: '12px' }}>PIN Code</label><input className="form-input" value={addressPincode} onChange={(e) => setAddressPincode(e.target.value)} placeholder="e.g. 110001" /></div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Primary Phone <span style={{ color:'#ef4444' }}>*</span></label>
                      <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 00000" required />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Email Address <span style={{ color:'#ef4444' }}>*</span></label>
                      <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@northhospital.com" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Emergency Contact (Name &amp; Relationship)</label>
                      <input className="form-input" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="e.g. Priya Nair (Spouse: +91 98111 22222)" />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Duty Status</label>
                      <select className="form-select" value={staffStatus} onChange={(e) => setStaffStatus(e.target.value as any)}>
                        <option value="ACTIVE">Active</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE & CREDENTIALS */}
              {modalTab === 'professional' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Lab Role <span style={{ color:'#ef4444' }}>*</span></label>
                      <select className="form-select" value={labRole} onChange={(e) => setLabRole(e.target.value)}>
                        <option>Lab Technologist</option>
                        <option>Sr. Lab Technologist</option>
                        <option>Consultant Pathologist</option>
                        <option>Hematopathologist</option>
                        <option>Clinical Biochemist</option>
                        <option>Phlebotomist</option>
                        <option>Lab In-Charge</option>
                      </select>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Designation <span style={{ color:'#ef4444' }}>*</span></label>
                      <input className="form-input" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Sr. Medical Lab Technologist" required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Qualification / Degree</label>
                      <input className="form-input" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. DMLT, B.Sc MLT, MD Pathology" />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>MCI / License Number</label>
                      <input className="form-input" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. MCI-2024-XXXXX" />
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Primary Lab Section</label>
                    <select className="form-select" value={labSection} onChange={(e) => setLabSection(e.target.value)}>
                      <option>Biochemistry</option>
                      <option>Hematology</option>
                      <option>Immunoassay</option>
                      <option>Microbiology</option>
                      <option>Blood Gas / ER</option>
                      <option>OPD Collection</option>
                      <option>Blood Bank</option>
                      <option>Histopathology</option>
                      <option>All sections</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 3: LAB STATIONING */}
              {modalTab === 'stationing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Shift Assignment</label>
                      <select className="form-select" value={shiftName} onChange={(e) => setShiftName(e.target.value)}>
                        <option>Morning 07–15</option>
                        <option>Evening 15–23</option>
                        <option>Night 23–07</option>
                        <option>Day 08–16</option>
                        <option>On call</option>
                      </select>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Bench / Station</label>
                      <input className="form-input" value={benchStation} onChange={(e) => setBenchStation(e.target.value)} placeholder="e.g. Bench 2 · Hem & Chem" />
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Competency Level</label>
                    <select className="form-select" value={competencyLevel} onChange={(e) => setCompetencyLevel(e.target.value)}>
                      <option>DMLT</option>
                      <option>BMLT</option>
                      <option>NABL Trained</option>
                      <option>DMLT · NABL trained</option>
                      <option>MCI Registered</option>
                      <option>BLS Certified</option>
                      <option>Assessment Pending</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4: COMPLIANCE & DOCUMENTS */}
              {modalTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>Aadhaar Number</label>
                      <input className="form-input" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      <label style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>BLS / CPR Validity</label>
                      <input type="date" className="form-input" value={blsValidity} onChange={(e) => setBlsValidity(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#f8fafc' }}>
                    <input type="checkbox" id="nabl-training" checked={nablTraining} onChange={(e) => setNablTraining(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <label htmlFor="nabl-training" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', margin: 0 }}>
                      NABL Quality Training completed
                    </label>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#1E40AF' }}>
                      📋 Physical document uploads (ID proof, degree certificates, license) are managed by Hospital Admin in the Staff Directory. The Department Admin can add staff now and Hospital Admin completes the document verification step.
                    </p>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {modalTab !== 'personal' && (
                    <button type="button"
                      onClick={() => setModalTab(modalTab === 'documents' ? 'stationing' : modalTab === 'stationing' ? 'professional' : 'personal')}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                      ← Previous
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { setShowAddStaffModal(false); resetModalForm(); }}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                    Cancel
                  </button>
                  {modalTab !== 'documents' ? (
                    <button type="button"
                      onClick={() => setModalTab(modalTab === 'personal' ? 'professional' : modalTab === 'professional' ? 'stationing' : 'documents')}
                      style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Next →
                    </button>
                  ) : (
                    <button type="submit"
                      style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} /> Register Staff Member
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
