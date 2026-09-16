import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogIn, CheckCircle2 } from 'lucide-react';

export const LogoutPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Perform session cleanup safely
    const timeout = setTimeout(() => {
      logout();
    }, 0);

    // Auto-countdown to redirect
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login?loggedOut=true');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [logout, navigate]);

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
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '2.5rem',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Hospital Branding */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#10b981',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
          }}
        >
          <CheckCircle2 size={36} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem' }}>
          Logged Out Successfully
        </h2>

        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          Your clinical session has been safely closed and access tokens revoked. No departmental data was saved locally.
        </p>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            fontSize: '0.875rem',
            color: 'var(--text-main)',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={18} color="var(--primary)" />
          <span>Redirecting to Login in <strong>{countdown}</strong> second{countdown === 1 ? '' : 's'}...</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/login?loggedOut=true')}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
            }}
          >
            <LogIn size={18} />
            <span>Go to Login Immediately</span>
          </button>

          <Link
            to="/login"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              marginTop: '0.25rem',
            }}
          >
            Switch to a different department account
          </Link>
        </div>
      </div>
    </div>
  );
};
