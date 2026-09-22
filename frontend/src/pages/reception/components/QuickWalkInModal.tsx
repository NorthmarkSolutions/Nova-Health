import React, { useState } from 'react';
import {
  X,
  Tag,
  Stethoscope,
  DoorClosed,
  DollarSign,
  AlertCircle,
  Printer,
  CheckCircle2,
  Clock,
  User,
  Phone,
  CreditCard,
  Zap,
} from 'lucide-react';
import { SharedQueueToken, SharedPatient, patientJourneyService } from '../../../services/patientJourneyService';
import { DepartmentTariffMaster } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tariffMaster: DepartmentTariffMaster;
  doctorsRoster: Array<{
    id?: string;
    name: string;
    dept: string;
    room: string;
    available: boolean;
    nextSlot: string;
    fee: number;
    followUpFee: number;
    emergencyFee: number;
  }>;
  existingPatients: SharedPatient[];
  onTokenGenerated: (token: SharedQueueToken, autoPrint?: boolean) => void;
}

export const QuickWalkInModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tariffMaster,
  doctorsRoster,
  existingPatients,
  onTokenGenerated,
}) => {
  if (!isOpen) return null;

  // Form State
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [selectedUhid, setSelectedUhid] = useState<string>(existingPatients[0]?.uhid || '');
  const [patientSearch, setPatientSearch] = useState<string>('');

  // Quick New Patient Fields
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('+1 555-');
  const [quickAge, setQuickAge] = useState(30);
  const [quickGender, setQuickGender] = useState('MALE');

  // Doctor & Room
  const [selectedDoctorName, setSelectedDoctorName] = useState(doctorsRoster[0]?.name || 'Dr. Sarah Jenkins');
  const selectedDoctorObj = doctorsRoster.find((d) => d.name === selectedDoctorName) || doctorsRoster[0];

  // Visit Type & Priority
  const [visitType, setVisitType] = useState<'WALK_IN' | 'EMERGENCY' | 'FOLLOW_UP'>('WALK_IN');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'VIP'>('NORMAL');

  // Payment at Desk
  const [collectPaymentNow, setCollectPaymentNow] = useState(true);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');

  // Calculate Tariffs
  const regFee = tariffMaster.intakeRegistrationFee || 15;
  const triageFee = tariffMaster.triageVitalsFee || 10;
  const consultationFee =
    visitType === 'EMERGENCY'
      ? selectedDoctorObj?.emergencyFee || Math.round((selectedDoctorObj?.fee || 75) * 1.5)
      : visitType === 'FOLLOW_UP'
      ? selectedDoctorObj?.followUpFee || Math.round((selectedDoctorObj?.fee || 75) * 0.6)
      : selectedDoctorObj?.fee || 75;

  const totalFee = consultationFee + (patientMode === 'new' ? regFee : 0) + triageFee;

  // Selected Patient Details
  const selectedPatientObj = existingPatients.find((p) => p.uhid === selectedUhid) || existingPatients[0];

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();

    let finalPatientName = '';
    let finalUhid = '';
    let finalPhone = '';
    let finalAge = 32;
    let finalGender = 'MALE';
    let finalBloodGroup = 'O+';

    if (patientMode === 'existing' && selectedPatientObj) {
      finalPatientName = `${selectedPatientObj.firstName} ${selectedPatientObj.lastName}`;
      finalUhid = selectedPatientObj.uhid;
      finalPhone = selectedPatientObj.phone;
      finalAge = selectedPatientObj.age;
      finalGender = selectedPatientObj.gender;
      finalBloodGroup = selectedPatientObj.bloodGroup;
    } else {
      finalPatientName = quickName.trim() || 'Walk-in Patient';
      finalPhone = quickPhone.trim() || '+1 555-010-0000';
      finalAge = quickAge;
      finalGender = quickGender;
      finalUhid = `UHID-202609-${String(existingPatients.length + Math.floor(Math.random() * 900) + 100).padStart(5, '0')}`;

      // Register into master directory
      const newP: SharedPatient = {
        uhid: finalUhid,
        firstName: finalPatientName.split(' ')[0] || 'Walk-in',
        lastName: finalPatientName.split(' ').slice(1).join(' ') || 'Patient',
        phone: finalPhone,
        dob: '1995-01-01',
        age: finalAge,
        gender: finalGender,
        bloodGroup: finalBloodGroup,
        idType: 'National ID',
        idNumber: 'WALK-IN-' + Date.now().toString().slice(-4),
        emergencyContact: 'Walk-in Desk Contact',
        insurance: 'Self Pay (Cash)',
        visitsCount: 1,
        outstandingDue: 0,
        recentVisits: [
          {
            date: new Date().toISOString().split('T')[0],
            doctor: selectedDoctorName,
            dept: selectedDoctorObj?.dept || 'OPD',
            diagnosis: 'Walk-in Initial Evaluation',
          },
        ],
      };
      patientJourneyService.registerPatient(newP);
    }

    const currentQueue = patientJourneyService.getQueue();
    const nextTokenNo = currentQueue.length > 0 ? Math.max(...currentQueue.map((q) => q.token)) + 1 : 1;
    const aptNo = `APT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextTokenNo).padStart(4, '0')}`;
    const invoiceNo = `INV-OPD-${String(nextTokenNo).padStart(4, '0')}`;

    const newToken: SharedQueueToken = {
      id: `tok-${Date.now()}`,
      token: nextTokenNo,
      aptNo,
      uhid: finalUhid,
      patient: finalPatientName,
      age: finalAge,
      gender: finalGender,
      bloodGroup: finalBloodGroup,
      phone: finalPhone,
      doctor: `${selectedDoctorName} (${selectedDoctorObj?.dept || 'OPD'})`,
      room: selectedDoctorObj?.room || 'Chamber 101',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: visitType,
      status: 'WAITING',
      priority: priority,
      feePaid: collectPaymentNow,
      totalFee: totalFee,
      paymentMode: collectPaymentNow ? paymentMode : 'UNPAID',
      invoiceNo: invoiceNo,
      callingStatus: 'IDLE',
      vitals: {
        bp: '120/80',
        pulse: 76,
        temp: 98.6,
        spo2: 99,
        height: 172,
        weight: 68,
        bmi: 23.0,
        triageNotes: priority === 'URGENT' ? 'PRIORITY WALK-IN: Urgent OPD Evaluation required.' : 'Standard Walk-In Check-In',
      },
    };

    patientJourneyService.addQueueToken(newToken);

    // If paid at desk, log invoice in patientJourneyService
    if (collectPaymentNow) {
      patientJourneyService.addInvoice({
        id: `inv-${Date.now()}`,
        invNo: invoiceNo,
        patientName: finalPatientName,
        uhid: finalUhid,
        phone: finalPhone,
        category: 'OPD',
        date: new Date().toISOString().split('T')[0],
        subtotal: totalFee,
        discount: 0,
        tax: 0,
        advanceDeducted: 0,
        total: totalFee,
        paid: totalFee,
        balance: 0,
        status: 'PAID',
        items: [
          {
            source: 'Consultation',
            description: `OPD Consultation Fee - ${selectedDoctorName} (${visitType})`,
            qty: 1,
            unitPrice: consultationFee,
            total: consultationFee,
          },
          {
            source: 'Misc',
            description: 'Nurse Triage & Vital Signs Recording',
            qty: 1,
            unitPrice: triageFee,
            total: triageFee,
          },
          ...(patientMode === 'new'
            ? [
                {
                  source: 'Misc' as const,
                  description: 'OPD Patient Registration & Digital UHID Creation',
                  qty: 1,
                  unitPrice: regFee,
                  total: regFee,
                },
              ]
            : []),
        ],
      });
    }

    onTokenGenerated(newToken, true);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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
              <Zap size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Issue Quick Walk-In OPD Token
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                30-second token dispenser with live department tariff calculation & chamber assignment
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

        <form onSubmit={handleCreateToken} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Patient Lookup / Quick Creation Toggle */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`subtab-pill ${patientMode === 'existing' ? 'active' : ''}`}
                onClick={() => setPatientMode('existing')}
                style={{ flex: 1, textAlign: 'center', padding: '0.45rem' }}
              >
                <User size={14} /> Existing Patient (UHID Lookup)
              </button>
              <button
                type="button"
                className={`subtab-pill ${patientMode === 'new' ? 'active' : ''}`}
                onClick={() => setPatientMode('new')}
                style={{ flex: 1, textAlign: 'center', padding: '0.45rem' }}
              >
                <Tag size={14} /> Fast Walk-In Intake
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Registered Patient</label>
                <select
                  className="form-select"
                  value={selectedUhid}
                  onChange={(e) => setSelectedUhid(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  {existingPatients.map((p) => (
                    <option key={p.uhid} value={p.uhid}>
                      {p.firstName} {p.lastName} • {p.uhid} • {p.phone} ({p.gender}, {p.age}y)
                    </option>
                  ))}
                </select>
                {selectedPatientObj && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>Blood: <strong>{selectedPatientObj.bloodGroup}</strong></span>
                    <span>Insurance: <strong>{selectedPatientObj.insurance.split('•')[0]}</strong></span>
                    <span>Past Visits: <strong>{selectedPatientObj.visitsCount}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. David Miller"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Age</label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    className="form-input"
                    value={quickAge}
                    onChange={(e) => setQuickAge(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Gender</label>
                  <select
                    className="form-select"
                    value={quickGender}
                    onChange={(e) => setQuickGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Doctor & Chamber Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">
                Attending Consultant (OPD Stationed) *
              </label>
              <select
                className="form-select"
                value={selectedDoctorName}
                onChange={(e) => setSelectedDoctorName(e.target.value)}
                style={{ fontWeight: 700 }}
              >
                {doctorsRoster.map((doc, idx) => (
                  <option key={idx} value={doc.name}>
                    {doc.name} — {doc.dept} (${doc.fee})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Assigned Chamber</label>
              <div
                style={{
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1.5px solid #bbf7d0',
                  color: '#15803d',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <DoorClosed size={16} />
                <span>{selectedDoctorObj?.room || 'Chamber 101'} (Active)</span>
              </div>
            </div>
          </div>

          {/* Visit Category & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Visit Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['WALK_IN', 'FOLLOW_UP', 'EMERGENCY'] as const).map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    className={`subtab-pill ${visitType === vt ? 'active' : ''}`}
                    onClick={() => setVisitType(vt)}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    {vt === 'WALK_IN' ? 'Standard' : vt === 'FOLLOW_UP' ? 'Follow-Up' : 'Emergency'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Queue Priority</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['NORMAL', 'URGENT', 'VIP'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`subtab-pill ${priority === p ? 'active' : ''}`}
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.5rem',
                      backgroundColor: priority === p ? (p === 'URGENT' ? '#ef4444' : p === 'VIP' ? '#8b5cf6' : '#0284c7') : undefined,
                      color: priority === p ? '#ffffff' : undefined,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tariff Breakdown & Fast Counter Collection */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} color="#38bdf8" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Department Tariff Breakdown</span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Live Synchronized with Dept Settings</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', fontSize: '0.75rem', borderTop: '1px solid #1e293b', paddingTop: '0.5rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Consultation Fee</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#38bdf8' }}>${consultationFee}.00</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Nurse Triage</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#a78bfa' }}>${triageFee}.00</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Registration UHID</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#4ade80' }}>
                  {patientMode === 'new' ? `$${regFee}.00` : '$0.00 (Exempt)'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #334155', paddingLeft: '0.75rem' }}>
                <span style={{ color: '#facc15', fontWeight: 800 }}>Total Counter Bill</span>
                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#facc15' }}>${totalFee}.00</div>
              </div>
            </div>

            {/* Payment Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                <input
                  type="checkbox"
                  checked={collectPaymentNow}
                  onChange={(e) => setCollectPaymentNow(e.target.checked)}
                />
                <span>Collect payment at Reception Counter</span>
              </label>

              {collectPaymentNow && (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {(['CASH', 'CARD', 'UPI'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.7188rem',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        backgroundColor: paymentMode === mode ? '#0284c7' : '#1e293b',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}
            >
              <Printer size={16} /> Issue Token & Print Slip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
