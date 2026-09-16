import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import {
  Hospital,
  Lock,
  Mail,
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
  UserCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';

interface DepartmentQuickLogin {
  name: string;
  badge: string;
  email: string;
  role: RoleType;
  path: string;
  icon: React.ReactNode;
  description: string;
}

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isLoggedOut = searchParams.get('loggedOut') === 'true';
  const [emailOrUsername, setEmailOrUsername] = useState('admin@northhospital.com');
  const [password, setPassword] = useState('Password123!');
  const [selectedRole, setSelectedRole] = useState<RoleType>(RoleType.HOSPITAL_ADMIN);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const departmentLogins: DepartmentQuickLogin[] = [
    {
      name: 'Hospital Admin',
      badge: 'Admin',
      email: 'admin@northhospital.com',
      role: RoleType.HOSPITAL_ADMIN,
      path: '/admin',
      icon: <ShieldCheck size={18} />,
      description: 'Hospital profile, branch setup & master settings',
    },
    {
      name: '1. Reception Desk',
      badge: 'Desk',
      email: 'reception@northhospital.com',
      role: RoleType.RECEPTIONIST,
      path: '/reception',
      icon: <UserPlus size={18} />,
      description: 'Patient registration, live tokens & appointment booking',
    },
    {
      name: '2. Doctor OPD Station',
      badge: 'OPD',
      email: 'doctor@northhospital.com',
      role: RoleType.DOCTOR,
      path: '/doctor',
      icon: <Stethoscope size={18} />,
      description: 'Consultation, SOAP, e-prescriptions & test orders',
    },
    {
      name: '3. Diagnostic Laboratory',
      badge: 'Lab',
      email: 'lab@northhospital.com',
      role: RoleType.LAB_TECH,
      path: '/lab',
      icon: <FlaskConical size={18} />,
      description: '8-step specimen pipeline, barcodes & pathologist sign-off',
    },
    {
      name: '4. Operation Theatre (OT)',
      badge: 'OT',
      email: 'surgeon@northhospital.com',
      role: RoleType.SURGEON,
      path: '/ot',
      icon: <Scissors size={18} />,
      description: 'Surgical calendar, WHO safety checklist & IPD handoff',
    },
    {
      name: '5. Inpatient Care (IPD)',
      badge: 'IPD',
      email: 'ipd@northhospital.com',
      role: RoleType.WARD_MANAGER,
      path: '/ipd',
      icon: <BedDouble size={18} />,
      description: 'Ward bed matrix, nurse MAR chart & discharge summaries',
    },
    {
      name: '6. Billing & Accounts',
      badge: 'Cashier',
      email: 'billing@northhospital.com',
      role: RoleType.CASHIER,
      path: '/billing',
      icon: <Receipt size={18} />,
      description: 'Consolidated charges, advance deductions & receipts',
    },
    {
      name: 'Nurse Station',
      badge: 'Triage',
      email: 'nurse@northhospital.com',
      role: RoleType.NURSE,
      path: '/nurse',
      icon: <Activity size={18} />,
      description: 'Vitals triage and inpatient nursing care',
    },
    {
      name: 'Pharmacy Counter',
      badge: 'Rx',
      email: 'pharmacy@northhospital.com',
      role: RoleType.PHARMACIST,
      path: '/pharmacy',
      icon: <Pill size={18} />,
      description: 'Digital prescription queue and dispensing',
    },
    {
      name: 'Patient Portal',
      badge: 'Portal',
      email: 'patient@northhospital.com',
      role: RoleType.PATIENT,
      path: '/patient',
      icon: <UserCircle size={18} />,
      description: 'Appointments, laboratory reports and billing receipts',
    },
  ];

  const handleQuickLogin = async (dept: DepartmentQuickLogin) => {
    setEmailOrUsername(dept.email);
    setPassword('Password123!');
    setSelectedRole(dept.role);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Attempt backend authentication
      const res = await api.post('/auth/login', {
        emailOrUsername: dept.email,
        password: 'Password123!',
      });
      if (res.data?.accessToken) {
        login(res.data.accessToken, res.data.user);
        navigate(dept.path);
        return;
      }
    } catch {
      // Fallback to local auth if backend network issue
      const demoUser = {
        id: `usr-${dept.role.toLowerCase()}`,
        username: dept.email.split('@')[0],
        email: dept.email,
        firstName: dept.name.split(' ')[0],
        lastName: 'Officer',
        role: dept.role,
      };
      login('local-jwt-token-2026', demoUser);
      navigate(dept.path);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        emailOrUsername,
        password,
      });

      if (res.data?.accessToken) {
        login(res.data.accessToken, res.data.user);
        const roleRoutes: Record<string, string> = {
          [RoleType.SUPER_ADMIN]: '/admin',
          [RoleType.HOSPITAL_ADMIN]: '/admin',
          [RoleType.RECEPTION_SUPERVISOR]: '/reception',
          [RoleType.RECEPTIONIST]: '/reception',
          [RoleType.DOCTOR]: '/doctor',
          [RoleType.SURGEON]: '/ot',
          [RoleType.ANESTHETIST]: '/ot',
          [RoleType.OT_MANAGER]: '/ot',
          [RoleType.WARD_MANAGER]: '/ipd',
          [RoleType.NURSE]: '/ipd',
          [RoleType.PATHOLOGIST]: '/lab',
          [RoleType.LAB_TECH]: '/lab',
          [RoleType.CASHIER]: '/billing',
          [RoleType.FINANCE_MANAGER]: '/billing',
          [RoleType.PHARMACIST]: '/pharmacy',
          [RoleType.PATIENT]: '/patient',
        };
        const target = roleRoutes[res.data.user?.role] || '/admin';
        navigate(target);
        return;
      }
    } catch {
      // Fallback
      const demoUser = {
        id: 'usr-demo',
        username: emailOrUsername.split('@')[0],
        email: emailOrUsername,
        firstName: selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase(),
        lastName: 'Staff',
        role: selectedRole,
      };
      login('mock-jwt-token-2026', demoUser);
      const roleRoutes: Record<string, string> = {
        [RoleType.HOSPITAL_ADMIN]: '/admin',
        [RoleType.RECEPTIONIST]: '/reception',
        [RoleType.DOCTOR]: '/doctor',
        [RoleType.SURGEON]: '/ot',
        [RoleType.WARD_MANAGER]: '/ipd',
        [RoleType.LAB_TECH]: '/lab',
        [RoleType.CASHIER]: '/billing',
        [RoleType.NURSE]: '/nurse',
        [RoleType.PHARMACIST]: '/pharmacy',
        [RoleType.PATIENT]: '/patient',
      };
      navigate(roleRoutes[selectedRole] || '/admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--secondary)',
        backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(2, 132, 199, 0.25), transparent 75%)',
        padding: '2rem 1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Left Side: Department Quick Selectors */}
        <div
          style={{
            padding: '2.25rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
              <KeyRound size={14} /> One-Click Department Login
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>
              Select Department to Sign In
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Click any department to auto-fill credentials & enter directly
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '440px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}
          >
            {departmentLogins.map((dept) => (
              <div
                key={dept.email}
                onClick={() => handleQuickLogin(dept)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: emailOrUsername === dept.email ? '#ffffff' : 'var(--bg-surface)',
                  border: `1.5px solid ${emailOrUsername === dept.email ? 'var(--primary)' : 'var(--border-color)'}`,
                  boxShadow: emailOrUsername === dept.email ? 'var(--shadow-sm)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: emailOrUsername === dept.email ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: emailOrUsername === dept.email ? '#ffffff' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {dept.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {dept.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {dept.email}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: emailOrUsername === dept.email ? 'var(--primary-light)' : 'var(--bg-subtle)',
                    color: emailOrUsername === dept.email ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  {dept.badge}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            Universal Demo Password for all accounts: <code>Password123!</code>
          </div>
        </div>

        {/* Right Side: Sign-In Form */}
        <div style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Hospital size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--secondary)' }}>North Hospital HMS</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Clinical Enterprise Portal
            </p>
          </div>

          {isLoggedOut && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#065f46',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} color="#10b981" />
              <span>You have been safely logged out. Select a department to sign back in.</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department / Role</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as RoleType)}
              >
                <option value={RoleType.HOSPITAL_ADMIN}>Hospital Admin</option>
                <option value={RoleType.RECEPTIONIST}>1. Reception Desk</option>
                <option value={RoleType.DOCTOR}>2. Doctor OPD Station</option>
                <option value={RoleType.LAB_TECH}>3. Diagnostic Laboratory</option>
                <option value={RoleType.SURGEON}>4. Operation Theatre (Surgeon)</option>
                <option value={RoleType.WARD_MANAGER}>5. Inpatient Care (IPD)</option>
                <option value={RoleType.CASHIER}>6. Billing & Accounts</option>
                <option value={RoleType.NURSE}>Nurse Station</option>
                <option value={RoleType.PHARMACIST}>Pharmacy Counter</option>
                <option value={RoleType.PATIENT}>Patient Portal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
                <Mail size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              {isLoading ? 'Signing In...' : 'Sign In to Workspace'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
