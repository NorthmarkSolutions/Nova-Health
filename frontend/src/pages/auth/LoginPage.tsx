import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import {
  Hospital,
  Building2,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Stethoscope,
  FlaskConical,
  Scissors,
  BedDouble,
  Receipt,
  Activity,
  Pill,
  Radio,
  HeartPulse,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import {
  HOSPITAL_FACILITIES,
  DEPARTMENT_LOGIN_NODES,
  DepartmentNode,
  DemoStaffAccount,
  HospitalFacility,
  StaffCadre,
  CADRE_METADATA,
  getDepartmentCadres,
  getDepartmentStaffByCadre,
  findDemoStaffByCredential,
} from './authCatalog';
import {
  requestPasswordReset,
  completePasswordReset,
  validatePasswordStrength,
} from '../../services/authResetService';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isLoggedOut = searchParams.get('loggedOut') === 'true';
  const { login } = useAuth();
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // LEVEL 1: Hospital Facility (Multi-Tenant SaaS Ready)
  // -------------------------------------------------------------
  const [selectedFacility, setSelectedFacility] = useState<HospitalFacility>(HOSPITAL_FACILITIES[0]);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // -------------------------------------------------------------
  // LEVEL 2: Department Selection
  // -------------------------------------------------------------
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-opd');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Active department object
  const activeDepartment: DepartmentNode = useMemo(() => {
    return (
      DEPARTMENT_LOGIN_NODES.find((d) => d.id === selectedDeptId) ||
      DEPARTMENT_LOGIN_NODES[1]
    );
  }, [selectedDeptId]);

  // -------------------------------------------------------------
  // LEVEL 3: Staff Classification (Cadre Selector)
  // -------------------------------------------------------------
  const availableCadres: StaffCadre[] = useMemo(() => {
    return getDepartmentCadres(activeDepartment.id);
  }, [activeDepartment.id]);

  const [selectedCadre, setSelectedCadre] = useState<StaffCadre>('doctor');

  // Ensure selected cadre exists in the newly chosen department
  useEffect(() => {
    if (!availableCadres.includes(selectedCadre)) {
      setSelectedCadre(availableCadres[0] || 'admin');
    }
  }, [availableCadres, selectedCadre]);

  // Staff members in the currently selected department & cadre
  const cadreStaffList: DemoStaffAccount[] = useMemo(() => {
    return getDepartmentStaffByCadre(activeDepartment.id, selectedCadre);
  }, [activeDepartment.id, selectedCadre]);

  // Active staff selection in the cadre
  const [activeStaffId, setActiveStaffId] = useState<string>('');

  useEffect(() => {
    if (cadreStaffList.length > 0) {
      const defaultStaff = cadreStaffList[0];
      setActiveStaffId(defaultStaff.id);
      setEmployeeIdOrEmail(defaultStaff.employeeId);
      setPassword('Password123!');
      setAutofillNotice(`Selected: ${defaultStaff.name} (${defaultStaff.designation})`);
    } else {
      setActiveStaffId('');
    }
  }, [cadreStaffList]);

  // -------------------------------------------------------------
  // LEVEL 4: Staff Login Form State
  // -------------------------------------------------------------
  const [employeeIdOrEmail, setEmployeeIdOrEmail] = useState('EMP-DOC-101');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autofillNotice, setAutofillNotice] = useState<string | null>(
    'Default: Dr. Sarah Jenkins (Attending Physician)'
  );

  // Password Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'complete'>('request');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ isError: boolean; message: string } | null>(null);

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    const res = requestPasswordReset(resetIdentifier);
    if (res.success) {
      setResetToken(res.resetToken || '');
      setResetStep('complete');
      setResetStatus({ isError: false, message: res.message });
    } else {
      setResetStatus({ isError: true, message: res.message });
    }
  };

  const handleCompleteReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    const val = validatePasswordStrength(newPassword);
    if (!val.isValid) {
      setResetStatus({ isError: true, message: val.errors.join(' ') });
      return;
    }
    const res = completePasswordReset(resetToken, newPassword);
    if (res.success) {
      setResetStatus({ isError: false, message: res.message });
      setPassword(newPassword);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetStep('request');
        setResetStatus(null);
      }, 2000);
    } else {
      setResetStatus({ isError: true, message: res.message });
    }
  };

  // Filtered department list based on category & search (Left Panel)
  const filteredDepartments = useMemo(() => {
    return DEPARTMENT_LOGIN_NODES.filter((dept) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'clinical' && dept.category === 'clinical') ||
        (selectedCategory === 'emergency' && dept.category === 'emergency') ||
        (selectedCategory === 'diagnostic' && dept.category === 'diagnostic') ||
        (selectedCategory === 'admin' && (dept.category === 'admin' || dept.category === 'support'));

      const query = deptSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        dept.name.toLowerCase().includes(query) ||
        dept.code.toLowerCase().includes(query) ||
        dept.shortName.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, deptSearchQuery]);

  // Icon renderer helper
  const renderIcon = (iconKey: string, size = 18, color?: string) => {
    switch (iconKey) {
      case 'ShieldCheck':
        return <ShieldCheck size={size} color={color} />;
      case 'Stethoscope':
        return <Stethoscope size={size} color={color} />;
      case 'UserPlus':
        return <UserPlus size={size} color={color} />;
      case 'BedDouble':
        return <BedDouble size={size} color={color} />;
      case 'Activity':
        return <Activity size={size} color={color} />;
      case 'Scissors':
        return <Scissors size={size} color={color} />;
      case 'HeartPulse':
        return <HeartPulse size={size} color={color} />;
      case 'Receipt':
        return <Receipt size={size} color={color} />;
      case 'FlaskConical':
        return <FlaskConical size={size} color={color} />;
      case 'Pill':
        return <Pill size={size} color={color} />;
      case 'Radio':
        return <Radio size={size} color={color} />;
      case 'UserCheck':
        return <UserCheck size={size} color={color} />;
      default:
        return <Building2 size={size} color={color} />;
    }
  };

  // Helper to select a department card
  const handleSelectDepartment = (dept: DepartmentNode) => {
    setSelectedDeptId(dept.id);
    setErrorMsg(null);
  };

  // Helper to select a specific staff member inside the cadre
  const handleSelectStaff = (staff: DemoStaffAccount, autoSubmit = false) => {
    setActiveStaffId(staff.id);
    setEmployeeIdOrEmail(staff.employeeId);
    setPassword('Password123!');
    setErrorMsg(null);
    setAutofillNotice(`Autofilled: ${staff.name} (${staff.designation})`);

    if (autoSubmit) {
      executeAuthentication(staff.employeeId, 'Password123!', staff);
    }
  };

  // Core Authentication Execution
  const executeAuthentication = async (
    credentialId: string,
    pass: string,
    staffHint?: DemoStaffAccount
  ) => {
    setIsLoading(true);
    setErrorMsg(null);

    const resolvedStaff = staffHint || findDemoStaffByCredential(credentialId);

    try {
      // 1. Try real backend JWT endpoint first
      const res = await api.post('/auth/login/', {
        emailOrUsername: resolvedStaff ? resolvedStaff.email : credentialId,
        password: pass,
      });

      if (res.data?.accessToken) {
        login(res.data.accessToken, res.data.user);
        const destination = resolvedStaff?.targetRoute || activeDepartment.defaultRoute;
        navigate(destination);
        return;
      }
    } catch {
      // 2. Seamless Mock / Dev Mode Fallback
      const effectiveRole = resolvedStaff?.role || activeDepartment.defaultRole;
      const effectiveName = resolvedStaff?.name || credentialId.split('@')[0];
      const effectiveEmail =
        resolvedStaff?.email ||
        (credentialId.includes('@') ? credentialId : `${credentialId.toLowerCase()}@northhospital.com`);

      const demoUser = {
        id: resolvedStaff ? resolvedStaff.id : `usr-${Date.now()}`,
        username: credentialId,
        email: effectiveEmail,
        firstName: effectiveName.split(' ')[0],
        lastName: effectiveName.split(' ').slice(1).join(' ') || 'Staff',
        role: effectiveRole,
        departmentId:
          activeDepartment.id === 'dept-admin'
            ? undefined
            : activeDepartment.id === 'dept-cardiology'
            ? 'dept-cardiology'
            : '1',
        departmentName: activeDepartment.name,
        departmentCode: activeDepartment.code,
      };

      login('local-jwt-token-2026', demoUser);
      const targetDestination = resolvedStaff?.targetRoute || activeDepartment.defaultRoute;
      navigate(targetDestination);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Level 4 Manual Form Submission
  const handleSubmitLoginForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdOrEmail.trim()) {
      setErrorMsg('Please enter your Employee ID or Email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }
    executeAuthentication(employeeIdOrEmail.trim(), password);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        backgroundImage:
          'radial-gradient(circle at 10% 20%, rgba(2, 132, 199, 0.16), transparent 45%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.14), transparent 50%)',
        padding: '1.5rem',
        overflowY: 'auto',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          backgroundColor: '#0f172a',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          overflow: 'hidden',
          minHeight: '660px',
        }}
      >
        {/* ============================================================ */}
        {/* LEFT PANEL: Level 1 Facility + Level 2 Departments (NO CLUTTER) */}
        {/* ============================================================ */}
        <div
          style={{
            padding: '1.75rem',
            backgroundColor: '#0b1329',
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem',
          }}
        >
          {/* Header & Hospital Branding */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <Building2 size={22} color="#ffffff" />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                    North Hospital HMS
                  </h1>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Enterprise Clinical Core
                  </span>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(2, 132, 199, 0.15)',
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={12} />
                SaaS Ready
              </div>
            </div>

            {/* LEVEL 1: Hospital Facility Dropdown */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'block' }}>
                Level 1: Campus / Facility
              </label>
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen((prev) => !prev)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: '#1e293b',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Hospital size={16} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                      {selectedFacility.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      {selectedFacility.campusName}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                    }}
                  >
                    {selectedFacility.code}
                  </span>
                  {isFacilityDropdownOpen ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                </div>
              </button>

              {/* Facility Selection Popover */}
              {isFacilityDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.375rem',
                    backgroundColor: '#1e293b',
                    borderRadius: '10px',
                    border: '1px solid #475569',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {HOSPITAL_FACILITIES.map((facility) => (
                    <div
                      key={facility.id}
                      onClick={() => {
                        setSelectedFacility(facility);
                        setIsFacilityDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        backgroundColor: selectedFacility.id === facility.id ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                          {facility.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          {facility.tagline}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: selectedFacility.id === facility.id ? '#0284c7' : '#334155',
                          color: '#ffffff',
                        }}
                      >
                        {facility.badge}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LEVEL 2: Department Selection Header & Controls */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                <KeyRound size={13} /> Level 2: Select Department Station
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                {filteredDepartments.length} Departments
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                placeholder="Filter departments (OPD, IPD, ICU, Lab...)"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'clinical', label: 'Clinical' },
                { id: 'emergency', label: 'Emergency' },
                { id: 'diagnostic', label: 'Diagnostics' },
                { id: 'admin', label: 'Admin & Desk' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: selectedCategory === cat.id ? '#0284c7' : '#1e293b',
                    color: selectedCategory === cat.id ? '#ffffff' : '#94a3b8',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Cards List (Lean & Non-Cluttered: No Staff Dumped Inside Cards!) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '380px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}
          >
            {filteredDepartments.map((dept) => {
              const isSelected = selectedDeptId === dept.id;

              return (
                <div
                  key={dept.id}
                  onClick={() => handleSelectDepartment(dept)}
                  style={{
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.14)' : '#1e293b',
                    border: `1.5px solid ${isSelected ? dept.accentColor : '#334155'}`,
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 4px 12px ${dept.accentColor}25` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: dept.bgLight,
                        color: dept.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${dept.borderLight}`,
                        flexShrink: 0,
                      }}
                    >
                      {renderIcon(dept.iconKey, 16, dept.accentColor)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                          {dept.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '0.08rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? dept.accentColor : '#334155',
                            color: '#ffffff',
                            fontFamily: 'monospace',
                          }}
                        >
                          {dept.code}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.05rem' }}>
                        {dept.operatingHours} • {dept.badge}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Clean Cadre Indicator Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: isSelected ? '#38bdf8' : '#94a3b8',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {dept.demoAccounts.length} Staff
                    </span>
                    {isSelected && <CheckCircle2 size={16} color={dept.accentColor} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Helper Note */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(2, 132, 199, 0.2)',
              fontSize: '0.6875rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Universal Demo Password: <strong style={{ color: '#38bdf8' }}>Password123!</strong></span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>4-Tier Architecture</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: Level 3 Staff Cadre + Level 4 Authentication */}
        {/* ============================================================ */}
        <div
          style={{
            padding: '2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Department Breadcrumb & Context Header */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: activeDepartment.bgLight,
                border: `1px solid ${activeDepartment.borderLight}`,
                color: activeDepartment.accentColor,
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '0.625rem',
              }}
            >
              {renderIcon(activeDepartment.iconKey, 14, activeDepartment.accentColor)}
              <span>{selectedFacility.shortName} • {activeDepartment.name}</span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
              Staff Workspace Login
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Select your staff classification below, or enter your Employee ID credentials directly.
            </p>
          </div>

          {/* Logged Out / Success Notice */}
          {isLoggedOut && (
            <div
              style={{
                padding: '0.55rem 0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                borderRadius: '8px',
                fontSize: '0.75rem',
                marginBottom: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} color="#10b981" />
              <span>You have been safely signed out. Select your role to sign back in.</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* LEVEL 3: Staff Classification (Cadre Segmented Tabs) */}
          {/* ============================================================ */}
          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <KeyRound size={12} /> Level 3: Staff Classification (Cadre)
            </label>

            {/* Cadre Segmented Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableCadres.length}, 1fr)`, gap: '0.375rem' }}>
              {availableCadres.map((cadreKey) => {
                const meta = CADRE_METADATA[cadreKey] || {
                  label: cadreKey,
                  pluralLabel: cadreKey,
                  iconKey: 'User',
                  badgeColor: '#0284c7',
                };
                const isSelected = selectedCadre === cadreKey;
                const count = getDepartmentStaffByCadre(activeDepartment.id, cadreKey).length;

                return (
                  <button
                    key={cadreKey}
                    type="button"
                    onClick={() => setSelectedCadre(cadreKey)}
                    style={{
                      padding: '0.55rem 0.45rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? meta.badgeColor : '#334155'}`,
                      backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.18)' : '#1e293b',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {renderIcon(meta.iconKey, 14, isSelected ? meta.badgeColor : '#94a3b8')}
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {meta.pluralLabel}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '0.05rem 0.35rem',
                        borderRadius: '3px',
                        backgroundColor: isSelected ? meta.badgeColor : '#0f172a',
                        color: '#ffffff',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================ */}
          {/* LEVEL 4: Staff Selector (Development / Demo Mode) */}
          {/* ============================================================ */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              border: '1px solid #334155',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Level 4: Staff Station ({CADRE_METADATA[selectedCadre]?.label || selectedCadre})
              </div>
              <span style={{ fontSize: '0.625rem', color: '#10b981', fontWeight: 700 }}>
                ⚡ 1-Click Fast Auth
              </span>
            </div>

            {/* Compact Cadre-Filtered Staff Chips/Cards */}
            {cadreStaffList.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.25rem 0' }}>
                No demo staff registered under this cadre. Use manual credentials below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {cadreStaffList.map((staff) => {
                  const isActive = activeStaffId === staff.id;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleSelectStaff(staff, false)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: isActive ? 'rgba(2, 132, 199, 0.25)' : '#0f172a',
                        border: `1px solid ${isActive ? '#0284c7' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {staff.avatarInitials}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {staff.name}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {staff.designation} • <code style={{ color: '#38bdf8' }}>{staff.employeeId}</code>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStaff(staff, true);
                        }}
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        title="Instant 1-Click Login"
                      >
                        <Zap size={11} /> 1-Click
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Autofill Notice */}
          {autofillNotice && (
            <div
              style={{
                padding: '0.45rem 0.65rem',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                borderRadius: '6px',
                fontSize: '0.6875rem',
                marginBottom: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Sparkles size={12} />
              <span>{autofillNotice}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                padding: '0.55rem 0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '6px',
                fontSize: '0.75rem',
                marginBottom: '0.875rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* ============================================================ */}
          {/* LEVEL 4: Staff Credentials Form */}
          {/* ============================================================ */}
          <form onSubmit={handleSubmitLoginForm} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Employee ID or Username / Email */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem', display: 'block' }}>
                Employee ID or Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={employeeIdOrEmail}
                  onChange={(e) => {
                    setEmployeeIdOrEmail(e.target.value);
                    setAutofillNotice(null);
                  }}
                  placeholder="e.g. EMP-DOC-101 or doctor@northhospital.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.35rem',
                    fontSize: '0.8125rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                />
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  Password
                </label>
                <span
                  onClick={() => {
                    setResetIdentifier(employeeIdOrEmail);
                    setIsResetModalOpen(true);
                    setResetStep('request');
                    setResetStatus(null);
                  }}
                  style={{ fontSize: '0.6875rem', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot / Reset?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 2.5rem 0.625rem 2.35rem',
                    fontSize: '0.8125rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Station Confirmation */}
            <div
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>
                  Target Station: <strong style={{ color: '#ffffff' }}>{activeDepartment.shortName}</strong> ({CADRE_METADATA[selectedCadre]?.label || selectedCadre})
                </span>
              </div>
              <span style={{ fontSize: '0.625rem', color: '#64748b', fontFamily: 'monospace' }}>
                {activeDepartment.defaultRoute}
              </span>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.35rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? (
                'Authenticating Session...'
              ) : (
                <>
                  Sign In to {activeDepartment.shortName} Station <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security Footnote */}
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.6875rem',
              color: '#64748b',
            }}
          >
            <span>🔒 HIPAA Compliant • 256-Bit SSL</span>
            <span>Audit Trail Enabled</span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsResetModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    Reset Staff Credentials
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Self-Service Credential Recovery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {resetStatus && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: resetStatus.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${resetStatus.isError ? '#ef4444' : '#10b981'}`,
                  color: resetStatus.isError ? '#f87171' : '#34d399',
                  fontSize: '0.7813rem',
                  marginBottom: '1rem',
                }}
              >
                {resetStatus.message}
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: '0.35rem' }}>
                    Employee Code or Registered Email
                  </label>
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="e.g. DOC-101 or dr.jenkins@northhospital.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.35rem 0 0' }}>
                    Enter your staff identity to verify authorization and generate an instant recovery token.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    style={{ padding: '0.55rem 1rem', borderRadius: '6px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', background: '#0284c7', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Request Reset Token
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: '0.35rem' }}>
                    Authorization Reset Token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: '0.35rem' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.35rem 0 0' }}>
                    Must contain at least 8 characters, an uppercase letter, a number, and a special symbol.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    ← Back to Identifier
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', background: '#0284c7', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Confirm & Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
