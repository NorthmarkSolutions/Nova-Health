import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  CreditCard,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Printer,
  HeartPulse,
  User,
  Phone,
  QrCode,
  Stethoscope,
  DoorClosed,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  Zap,
} from 'lucide-react';
import { Gender } from '../../../types';
import { SharedPatient, SharedQueueToken, patientJourneyService } from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  doctorsRoster: Array<{
    name: string;
    dept: string;
    room: string;
    fee: number;
  }>;
  onPatientRegistered: (patient: SharedPatient) => void;
  onProceedToBookAppointment?: (patient: SharedPatient) => void;
  onProceedToIssueWalkIn?: (patient: SharedPatient) => void;
}

export const PatientRegistrationWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  doctorsRoster,
  onPatientRegistered,
  onProceedToBookAppointment,
  onProceedToIssueWalkIn,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<number>(1);

  // STEP 1: Personal Demographics
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('1994-05-20');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [maritalStatus, setMaritalStatus] = useState('Single');

  // STEP 2: Contact & Govt Identity
  const [phone, setPhone] = useState('+1 555-');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('420 Park Avenue, North District');
  const [idType, setIdType] = useState('National ID');
  const [idNumber, setIdNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 555-');

  // STEP 3: Insurance & TPA
  const [insuranceType, setInsuranceType] = useState('Self Pay (Cash)');
  const [policyNumber, setPolicyNumber] = useState('');
  const [corporateSponsor, setCorporateSponsor] = useState('');
  const [preAuthStatus, setPreAuthStatus] = useState('Pre-Approved');

  // STEP 4: Medical Alerts & Allergies
  const [allergies, setAllergies] = useState<string[]>(['None']);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [requiresWheelchair, setRequiresWheelchair] = useState(false);

  // STEP 5: Immediate OPD Doctor Routing
  const [bookImmediateConsult, setBookImmediateConsult] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(doctorsRoster[0]?.name || 'Dr. Sarah Jenkins');
  const [treatmentConsentSigned, setTreatmentConsentSigned] = useState(true);
  const [hipaaConsentSigned, setHipaaConsentSigned] = useState(true);

  // Generated Patient Preview Card
  const [registeredPatient, setRegisteredPatient] = useState<SharedPatient | null>(null);
  const [registeredToken, setRegisteredToken] = useState<SharedQueueToken | null>(null);

  const calculateAge = (birthDateString: string) => {
    const bYear = new Date(birthDateString).getFullYear();
    return Math.max(1, isNaN(bYear) ? 30 : new Date().getFullYear() - bYear);
  };

  const handleToggleAllergy = (allergy: string) => {
    if (allergy === 'None') {
      setAllergies(['None']);
      return;
    }
    const filtered = allergies.filter((a) => a !== 'None');
    if (filtered.includes(allergy)) {
      const next = filtered.filter((a) => a !== allergy);
      setAllergies(next.length ? next : ['None']);
    } else {
      setAllergies([...filtered, allergy]);
    }
  };

  const handleToggleChronic = (cond: string) => {
    if (chronicConditions.includes(cond)) {
      setChronicConditions(chronicConditions.filter((c) => c !== cond));
    } else {
      setChronicConditions([...chronicConditions, cond]);
    }
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();

    const currentPatients = patientJourneyService.getPatients();
    const uhidNumber = `UHID-202609-${String(currentPatients.length + 1).padStart(5, '0')}`;
    const age = calculateAge(dob);

    const newPatient: SharedPatient = {
      uhid: uhidNumber,
      firstName: firstName.trim() || 'New',
      lastName: lastName.trim() || 'Patient',
      phone: phone.trim(),
      dob,
      age,
      gender,
      bloodGroup,
      idType,
      idNumber: idNumber.trim() || 'ID-' + Math.floor(100000 + Math.random() * 900000),
      emergencyContact: `${emergencyContactName || 'Family'} (${emergencyRelation}) • ${emergencyPhone}`,
      insurance: insuranceType === 'Self Pay (Cash)' ? 'Self Pay (Cash)' : `${insuranceType} • Pol# ${policyNumber || 'POL-PENDING'}`,
      visitsCount: 0,
      outstandingDue: 0.0,
      recentVisits: [],
    };

    patientJourneyService.registerPatient(newPatient);
    setRegisteredPatient(newPatient);
    setStep(6); // Step 6 is Success / UHID Pass & Next Action
    onPatientRegistered(newPatient);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '780px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.5rem',
                borderRadius: '10px',
                display: 'flex',
              }}
            >
              <UserPlus size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Patient Registration Wizard
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {step <= 5
                  ? `Step ${step} of 5: ${
                      step === 1
                        ? 'Personal & Demographics'
                        : step === 2
                        ? 'Govt Identity & Contacts'
                        : step === 3
                        ? 'Insurance & TPA Sponsor'
                        : step === 4
                        ? 'Medical Alerts & Allergies'
                        : 'Consent & OPD Routing'
                    }`
                  : 'UHID Onboarding Complete • Digital Health Card Generated'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        {step <= 5 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '5px',
                  borderRadius: '3px',
                  backgroundColor: step >= s ? '#0284c7' : '#e2e8f0',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* STEP 1: Personal Demographics */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Arthur"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Pendelton"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Calculated Age</label>
                <div style={{ padding: '0.55rem', backgroundColor: '#f1f5f9', borderRadius: '8px', fontWeight: 700 }}>
                  {calculateAge(dob)} Years
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group *</label>
                <select
                  className="form-select"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <select
                  className="form-select"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hospital Registration Category</label>
                <div style={{ padding: '0.55rem', backgroundColor: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontWeight: 700, fontSize: '0.8125rem' }}>
                  Standard OPD Walk-In & Daycare Intake
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Identity & Contact Details */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Primary Mobile Phone *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 555-019-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Govt Identification Type *</label>
                <select
                  className="form-select"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                >
                  <option value="National ID">National ID / Aadhaar</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver License</option>
                  <option value="Social Security">Social Security Number</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Identity Document Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. P9821804B"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase' }}>
                Emergency Contact Details
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contact Person Full Name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  required
                />
                <select
                  className="form-select"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Guardian">Legal Guardian</option>
                </select>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Emergency Phone"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Insurance & TPA Sponsor */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Category / Insurance</label>
                <select
                  className="form-select"
                  value={insuranceType}
                  onChange={(e) => setInsuranceType(e.target.value)}
                >
                  <option value="Self Pay (Cash)">Self Pay (Direct Counter Cash / Card / UPI)</option>
                  <option value="BlueCross BlueShield">BlueCross BlueShield Care</option>
                  <option value="Aetna Global Health">Aetna Global Health</option>
                  <option value="United HealthCare">United HealthCare Platinum</option>
                  <option value="Cigna Global">Cigna Global</option>
                  <option value="Corporate Sponsor">Corporate Corporate Account</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Policy / Member ID Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={insuranceType === 'Self Pay (Cash)' ? 'Not Applicable (Self Pay)' : 'e.g. POL-992102-BCBS'}
                  disabled={insuranceType === 'Self Pay (Cash)'}
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                />
              </div>
            </div>

            {insuranceType !== 'Self Pay (Cash)' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Corporate / Employer Sponsor</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apex Global Tech Ltd"
                    value={corporateSponsor}
                    onChange={(e) => setCorporateSponsor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pre-Authorization Clearance</label>
                  <select
                    className="form-select"
                    value={preAuthStatus}
                    onChange={(e) => setPreAuthStatus(e.target.value)}
                  >
                    <option value="Pre-Approved">Pre-Approved (Immediate OPD Coverage)</option>
                    <option value="Pending Clearance">Pending TPA Clearance</option>
                    <option value="Co-Pay Required">Co-Pay 20% Required</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '0.8125rem', color: '#166534' }}>
              <strong>TPA Desk Note:</strong> OPD doctor consultations and emergency visits can be claimed at the billing cashier upon discharge with valid policy identification.
            </div>
          </div>
        )}

        {/* STEP 4: Medical Alerts & Allergies */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c' }}>
                <AlertCircle size={16} /> Known Drug & Environmental Allergies
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem' }}>
                {['None', 'Penicillin', 'Sulfa Drugs', 'Aspirin / NSAIDs', 'Latex', 'Iodine Contrast', 'Peanuts'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => handleToggleAllergy(a)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.7813rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: allergies.includes(a) ? (a === 'None' ? '#10b981' : '#ef4444') : '#cbd5e1',
                      backgroundColor: allergies.includes(a) ? (a === 'None' ? '#dcfce7' : '#fee2e2') : '#ffffff',
                      color: allergies.includes(a) ? (a === 'None' ? '#15803d' : '#991b1b') : 'var(--secondary)',
                    }}
                  >
                    {allergies.includes(a) && a !== 'None' ? '⚠️ ' : ''}{a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e3a8a' }}>
                <HeartPulse size={16} /> Chronic Conditions & Clinical Comorbidities
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem' }}>
                {['Type 2 Diabetes', 'Hypertension', 'Bronchial Asthma', 'Coronary Artery Disease', 'Chronic Kidney Disease', 'Thyroid Disorder'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleToggleChronic(c)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.7813rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: chronicConditions.includes(c) ? '#0284c7' : '#cbd5e1',
                      backgroundColor: chronicConditions.includes(c) ? '#e0f2fe' : '#ffffff',
                      color: chronicConditions.includes(c) ? '#0369a1' : 'var(--secondary)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={requiresWheelchair}
                  onChange={(e) => setRequiresWheelchair(e.target.checked)}
                />
                <span>Patient requires Wheelchair or Porter Assistance from Front Lobby</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: Consent & Treatment Routing */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
              <strong>General Treatment Authorization:</strong>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                I hereby grant permission to North Hospital medical practitioners to administer diagnostic testing, examinations, and preliminary OPD care. I acknowledge HIPAA data security and electronic record storage.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7813rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={treatmentConsentSigned}
                    onChange={(e) => setTreatmentConsentSigned(e.target.checked)}
                    required
                  />
                  <span>Patient / Guardian signed OPD Consent Agreement</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7813rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={hipaaConsentSigned}
                    onChange={(e) => setHipaaConsentSigned(e.target.checked)}
                    required
                  />
                  <span>HIPAA & Digital Health Record Privacy Acknowledged</span>
                </label>
              </div>
            </div>

            {/* Registration Summary Card */}
            <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '10px', border: '1.5px solid #bae6fd' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Registration Summary Preview
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#0369a1' }}>Full Name:</span>
                  <div style={{ fontWeight: 800 }}>{firstName} {lastName}</div>
                </div>
                <div>
                  <span style={{ color: '#0369a1' }}>Age / Gender:</span>
                  <div style={{ fontWeight: 700 }}>{calculateAge(dob)}y • {gender}</div>
                </div>
                <div>
                  <span style={{ color: '#0369a1' }}>Blood Group:</span>
                  <div style={{ fontWeight: 800, color: '#dc2626' }}>{bloodGroup}</div>
                </div>
                <div>
                  <span style={{ color: '#0369a1' }}>Phone:</span>
                  <div style={{ fontWeight: 700 }}>{phone}</div>
                </div>
                <div>
                  <span style={{ color: '#0369a1' }}>Govt ID:</span>
                  <div style={{ fontWeight: 700 }}>{idType}: {idNumber || 'Pending'}</div>
                </div>
                <div>
                  <span style={{ color: '#0369a1' }}>Billing Category:</span>
                  <div style={{ fontWeight: 700 }}>{insuranceType}</div>
                </div>
              </div>

              {allergies.filter((a) => a !== 'None').length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#b91c1c' }}>
                  <strong>Alert Allergies:</strong> {allergies.filter((a) => a !== 'None').join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Success & Smart UHID Card Preview */}
        {step === 6 && registeredPatient && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>
                Patient Successfully Registered!
              </h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Unique Health Identification Number (UHID) issued. Patient is added to Universal Directory.
              </p>
            </div>

            {/* Smart Digital Health Card */}
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                padding: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
                    NORTH HOSPITAL
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Universal Clinical Health Pass</div>
                </div>
                <QrCode size={36} color="#ffffff" />
              </div>

              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>
                {registeredPatient.firstName} {registeredPatient.lastName}
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#38bdf8', marginTop: '0.25rem', fontWeight: 800 }}>
                {registeredPatient.uhid}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Age / Gender:</span>
                  <div style={{ fontWeight: 700 }}>{registeredPatient.age}y • {registeredPatient.gender}</div>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Blood Group:</span>
                  <div style={{ fontWeight: 800, color: '#ef4444' }}>{registeredPatient.bloodGroup}</div>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Emergency:</span>
                  <div style={{ fontWeight: 700, fontSize: '0.6875rem' }}>{registeredPatient.phone}</div>
                </div>
              </div>
            </div>

            {/* Next Action Selection */}
            <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' }}>
                Select Next Receptionist Action for this Patient:
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onProceedToBookAppointment?.(registeredPatient);
                    onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.8125rem' }}
                >
                  <Calendar size={15} /> Book Appointment
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onProceedToIssueWalkIn?.(registeredPatient);
                    onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.8125rem', backgroundColor: '#0284c7' }}
                >
                  <Zap size={15} /> Issue Walk-In Token
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={13} /> Print Health Pass
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                >
                  Done (Return to Desk)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        {step <= 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(step - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (step === 1 && (!firstName.trim() || !lastName.trim())) {
                      alert('Please enter patient first and last name.');
                      return;
                    }
                    if (step === 2 && !phone.trim()) {
                      alert('Please enter a valid phone number.');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCompleteRegistration}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}
                >
                  <Sparkles size={16} /> Generate UHID & Issue Token
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
