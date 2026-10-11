import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setIsSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    // Simulate updating credentials in system
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        handleReset();
      }, 1500);
    }, 600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleReset}
    >
      <div
        style={{
          width: '480px',
          maxWidth: '95vw',
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
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Change Password
              </h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                Update your account authentication credentials
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
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
            onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {isSuccess ? (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', margin: 0 }}>
                    Password Updated
                  </h4>
                  <p style={{ fontSize: '13px', color: '#15803d', margin: '4px 0 0 0' }}>
                    Your password has been changed successfully. You can now use your new password.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#dc2626',
                      fontSize: '13px',
                    }}
                  >
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Current Password Field */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Current Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 40px 0 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    New Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 40px 0 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Must be at least 8 characters with letters and numbers.
                  </span>
                </div>

                {/* Confirm New Password Field */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 40px 0 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              {isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!isSuccess && (
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#2563eb')}
              >
                <Lock size={15} />
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
