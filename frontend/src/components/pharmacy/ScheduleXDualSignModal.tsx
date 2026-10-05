import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  User,
  KeyRound,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import pharmacyControlledDrugService, {
  EligibleWitnessStaff,
} from '../../services/pharmacyControlledDrugService';

interface ScheduleXDualSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (witnessData: {
    witnessId: string;
    witnessPin: string;
    witnessName: string;
    witnessRole: string;
    doctorLicense: string;
    remarks: string;
  }) => void;
  medicineName: string;
  schedule?: string;
  strength?: string;
  quantity: number;
  currentVaultStock?: number;
  prescribingDoctorName?: string;
  defaultDoctorLicense?: string;
  patientName?: string;
  patientUhid?: string;
  vaultLocation?: string;
}

export const ScheduleXDualSignModal: React.FC<ScheduleXDualSignModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  medicineName,
  schedule = 'Schedule X',
  strength = 'Standard',
  quantity,
  currentVaultStock = 30,
  prescribingDoctorName = 'Dr. Elena Morgan',
  defaultDoctorLicense = 'KMC 48211/2014',
  patientName = 'Patient',
  patientUhid = 'UHID-2026',
  vaultLocation = 'Vault Safe A (Dual Key Locked)',
}) => {
  const [witnesses, setWitnesses] = useState<EligibleWitnessStaff[]>([]);
  const [selectedWitnessId, setSelectedWitnessId] = useState('');
  const [witnessPin, setWitnessPin] = useState('');
  const [doctorLicense, setDoctorLicense] = useState(defaultDoctorLicense);
  const [remarks, setRemarks] = useState('Schedule X statutory dual verification complete');
  const [rxSighted, setRxSighted] = useState(true);
  const [photoIdVerified, setPhotoIdVerified] = useState(true);
  const [doseVerified, setDoseVerified] = useState(true);

  // Witness Verification State
  const [verifying, setVerifying] = useState(false);
  const [verifiedWitness, setVerifiedWitness] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load eligible witnesses when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setDoctorLicense(defaultDoctorLicense);
    setRemarks('Schedule X statutory dual verification complete');
    setWitnessPin('');
    setVerifiedWitness(null);
    setErrorMsg(null);

    pharmacyControlledDrugService
      .getEligibleWitnesses()
      .then((data) => {
        setWitnesses(data);
        if (data.length > 0) {
          setSelectedWitnessId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load eligible witnesses', err);
      });
  }, [isOpen, defaultDoctorLicense]);

  if (!isOpen) return null;

  const postDispenseStock = Math.max(0, currentVaultStock - quantity);

  const handleVerifyWitness = async () => {
    if (!selectedWitnessId) {
      setErrorMsg('Please select a secondary staff witness.');
      return;
    }
    if (!witnessPin.trim()) {
      setErrorMsg('Please enter witness PIN or password (e.g. 4412).');
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    try {
      const res = await pharmacyControlledDrugService.verifyWitness(
        selectedWitnessId,
        witnessPin.trim()
      );
      if (res.valid && res.witness_name) {
        setVerifiedWitness({
          name: res.witness_name,
          role: res.witness_role || 'Staff Witness',
        });
      } else {
        setErrorMsg(res.error || 'Witness verification failed.');
        setVerifiedWitness(null);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error || 'Invalid witness credentials. Please check PIN.'
      );
      setVerifiedWitness(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleFinalSubmit = () => {
    if (!verifiedWitness) {
      setErrorMsg('Secondary witness countersignature must be verified before proceeding.');
      return;
    }
    if (!doctorLicense.trim()) {
      setErrorMsg('Prescribing doctor medical council registration # is mandatory.');
      return;
    }
    if (!remarks.trim() || remarks.trim().length < 8) {
      setErrorMsg('Please provide statutory remarks (min 8 characters).');
      return;
    }
    if (!rxSighted || !photoIdVerified || !doseVerified) {
      setErrorMsg('All three statutory safety check boxes must be verified.');
      return;
    }

    onConfirm({
      witnessId: selectedWitnessId,
      witnessPin: witnessPin.trim(),
      witnessName: verifiedWitness.name,
      witnessRole: verifiedWitness.role,
      doctorLicense: doctorLicense.trim(),
      remarks: remarks.trim(),
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.7)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Amber Statutory Alert Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderBottom: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#991b1b',
                    background: '#fee2e2',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                  }}
                >
                  SCHEDULE X · DUAL SIGN-OFF REQUIRED
                </span>
              </div>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#111827',
                  marginTop: '4px',
                  margin: 0,
                }}
              >
                Controlled Substance Vault Authorization
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Statutory Advisory */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#475569',
              lineHeight: 1.5,
              display: 'flex',
              gap: '10px',
            }}
          >
            <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Statutory Compliance Mandate:</strong> Under the Drugs and Cosmetics Rules
              (Rule 65) and NDPS Act regulations, dispensing any Schedule X narcotic requires
              physical prescription sight verification, verified secondary staff witness
              countersignature, and immutable register logging.
            </div>
          </div>

          {/* Medicine & Vault Countdown Card */}
          <div
            style={{
              padding: '14px 16px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  {medicineName}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  Strength: {strength} · {vaultLocation}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#111827',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {schedule}
              </span>
            </div>

            {/* Real-time Vault Countdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                padding: '10px 12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Vault Available</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {currentVaultStock} units
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Dispense Qty</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                  − {quantity} units
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Balance After</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>
                  {postDispenseStock} units
                </div>
              </div>
            </div>
          </div>

          {/* Patient & Prescribing Doctor Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Recipient Patient
              </label>
              <div
                style={{
                  height: '38px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '13px',
                  color: '#111827',
                  fontWeight: 500,
                  marginTop: '4px',
                }}
              >
                {patientName} ({patientUhid})
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Prescribing Doctor License #
              </label>
              <input
                type="text"
                value={doctorLicense}
                onChange={(e) => setDoctorLicense(e.target.value)}
                placeholder="e.g. KMC 48211/2014"
                style={{
                  width: '100%',
                  height: '38px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#111827',
                  fontWeight: 500,
                  marginTop: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Statutory 3-Point Safety Checklist */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b' }}>
              MANDATORY STATUTORY SAFETY CHECKS
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={rxSighted}
                onChange={(e) => setRxSighted(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              Physical prescription sighted with doctor medical registration stamp
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={photoIdVerified}
                onChange={(e) => setPhotoIdVerified(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              Patient wristband / government photo ID verified against prescription
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={doseVerified}
                onChange={(e) => setDoseVerified(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              Calculated dose, interval, and vault lock withdrawal quantity verified
            </label>
          </div>

          {/* Secondary Witness Section */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={16} color="#1d4ed8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
                  Secondary Staff Witness Countersignature
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                Demo PIN: 4412
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '8px' }}>
              <select
                value={selectedWitnessId}
                onChange={(e) => {
                  setSelectedWitnessId(e.target.value);
                  setVerifiedWitness(null);
                }}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd',
                  padding: '0 8px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: '#ffffff',
                }}
              >
                {witnesses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.badge})
                  </option>
                ))}
              </select>

              <input
                type="password"
                value={witnessPin}
                onChange={(e) => {
                  setWitnessPin(e.target.value);
                  setVerifiedWitness(null);
                }}
                placeholder="Witness PIN / Pass"
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd',
                  padding: '0 10px',
                  fontSize: '13px',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={handleVerifyWitness}
                disabled={verifying}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {verifying ? 'Checking...' : 'Verify'}
              </button>
            </div>

            {/* Verified Badge */}
            {verifiedWitness && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#15803d',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  Verified: {verifiedWitness.name} · {verifiedWitness.role}
                </span>
              </div>
            )}
          </div>

          {/* Statutory Remarks */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
              Controlled Drug Register Remarks (Mandatory)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Schedule X post-thoracotomy analgesia protocol dual verified"
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'inherit',
                marginTop: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '8px',
              background: verifiedWitness ? '#15803d' : '#94a3b8',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: verifiedWitness ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} />
            Authorize Vault Dispense
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleXDualSignModal;
