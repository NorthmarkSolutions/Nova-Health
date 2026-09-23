import React, { useState, useEffect } from 'react';
import {
  X,
  BedDouble,
  DoorClosed,
  Clock,
  DollarSign,
  CheckCircle2,
  Printer,
  Calendar,
  AlertCircle,
  Stethoscope,
  HeartPulse,
  User,
} from 'lucide-react';
import { SharedPatient, SharedQueueToken, FlatCampusBed, patientJourneyService } from '../../../services/patientJourneyService';
import { DepartmentTariffMaster } from '../../../types';
import { InpatientCareDetails } from '../../../pages/admin/setup/organization/CampusInfrastructureSection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tariffMaster: DepartmentTariffMaster;
  existingPatients: SharedPatient[];
  activeTokens: SharedQueueToken[];
  preselectedBed?: FlatCampusBed | null;
  onBedAllocated?: (bedId: string) => void;
}

export const DaycareBedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tariffMaster,
  existingPatients,
  activeTokens,
  preselectedBed,
  onBedAllocated,
}) => {
  if (!isOpen) return null;

  const allFlatBeds = patientJourneyService.getFlatBedsList();
  const availableBeds = allFlatBeds.filter((b) => b.bed.status === 'AVAILABLE');

  const [selectedPatientUhid, setSelectedPatientUhid] = useState(
    activeTokens[0]?.uhid || existingPatients[0]?.uhid || ''
  );

  const [selectedBedId, setSelectedBedId] = useState(
    preselectedBed?.bed.id || availableBeds[0]?.bed.id || ''
  );

  const [stayHours, setStayHours] = useState(4);
  const [reservationNotes, setReservationNotes] = useState('Short-stay IV infusion & vitals stabilization');
  const [attendingDoctorName, setAttendingDoctorName] = useState('Dr. Sarah Jenkins');
  const [attendingNurseName, setAttendingNurseName] = useState('Nurse Priya Sharma, RN');
  const [isReserved, setIsReserved] = useState(false);

  useEffect(() => {
    if (preselectedBed) {
      setSelectedBedId(preselectedBed.bed.id);
    } else if (availableBeds[0]) {
      setSelectedBedId(availableBeds[0].bed.id);
    }
  }, [preselectedBed]);

  const activeTargetBed =
    allFlatBeds.find((b) => b.bed.id === selectedBedId) || preselectedBed || availableBeds[0];

  const selectedPatient =
    existingPatients.find((p) => p.uhid === selectedPatientUhid) || existingPatients[0];

  const hourlyRate = activeTargetBed
    ? Math.round(activeTargetBed.bed.dailyTariff / 8) || 20
    : 20;
  const estimatedCharge = hourlyRate * stayHours;

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTargetBed) {
      alert('Please select a valid vacant bed.');
      return;
    }

    const occupantData: InpatientCareDetails = {
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      uhid: selectedPatient.uhid,
      ipdAdmissionNo: `OBS-${Date.now().toString().slice(-4)}`,
      admissionDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      age: selectedPatient.age || 35,
      gender: (selectedPatient.gender?.toUpperCase() as any) || 'MALE',
      diagnosis: reservationNotes.trim() || 'Daycare Clinical Observation & Therapy',
      acuity: 'OBSERVATION',
      primaryDoctor: {
        id: 'doc-opd-assigned',
        name: attendingDoctorName,
        specialty: 'Clinical Consultant',
      },
      consultingDoctors: [],
      primaryNurse: {
        id: 'nurse-opd-assigned',
        name: attendingNurseName,
        shift: 'Morning',
      },
      cleanlinessStatus: 'SANITIZED',
      vitals: {
        bp: '120/80',
        pulse: '76 bpm',
        spo2: '99%',
        temp: '98.6 °F',
      },
    };

    patientJourneyService.allocateCampusBed(
      activeTargetBed.buildingId,
      activeTargetBed.floorId,
      activeTargetBed.wardId,
      activeTargetBed.bed.id,
      occupantData
    );

    setIsReserved(true);
    if (onBedAllocated) {
      onBedAllocated(activeTargetBed.bed.id);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          width: '92vw',
          maxWidth: '660px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                padding: '0.5rem',
                borderRadius: '10px',
                display: 'flex',
              }}
            >
              <BedDouble size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--secondary)' }}>
                OPD Daycare & Observation Bed Booking
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Allocate temporary observation beds for vitals monitoring, IV therapy & post-procedure care
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

        {!isReserved ? (
          <form onSubmit={handleConfirmReservation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Target Bed Summary Bar */}
            {activeTargetBed && (
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>ASSIGNED OBSERVATION BED</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a' }}>
                    {activeTargetBed.bed.bedNumber} • {activeTargetBed.roomNumber}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                    {activeTargetBed.wardName} ({activeTargetBed.floorName} • {activeTargetBed.buildingName})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                    🟢 Ready to Allocate
                  </span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', marginTop: '0.2rem' }}>
                    ${hourlyRate}/hr • ${activeTargetBed.bed.dailyTariff}/24h
                  </div>
                </div>
              </div>
            )}

            {/* Patient Selection */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Select Patient for Observation *
              </label>
              <select
                className="form-control"
                value={selectedPatientUhid}
                onChange={(e) => setSelectedPatientUhid(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {existingPatients.map((p) => (
                  <option key={p.uhid} value={p.uhid}>
                    {p.firstName} {p.lastName} ({p.uhid}) • {p.age}y / {p.gender} • Ph: {p.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Bed Switcher if not pre-selected */}
            {!preselectedBed && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Select Vacant Bed from Campus</label>
                <select
                  className="form-control"
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {availableBeds.map((b) => (
                    <option key={b.bed.id} value={b.bed.id}>
                      {b.bed.bedNumber} ({b.wardName} • {b.roomNumber}) — ${b.bed.dailyTariff}/day
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Doctors & Nurse Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <Stethoscope size={14} style={{ display: 'inline', marginRight: '4px' }} /> Attending Consultant *
                </label>
                <select
                  className="form-control"
                  value={attendingDoctorName}
                  onChange={(e) => setAttendingDoctorName(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins (General Medicine / OPD)</option>
                  <option value="Dr. Michael Chang">Dr. Michael Chang (Cardiology)</option>
                  <option value="Dr. Neil Patrick">Dr. Neil Patrick (Emergency & Trauma)</option>
                  <option value="Dr. Robert Vance">Dr. Robert Vance (Gastroenterology)</option>
                  <option value="Dr. Arthur Pendelton">Dr. Arthur Pendelton (Critical Care)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <HeartPulse size={14} style={{ display: 'inline', marginRight: '4px' }} /> Supervised Care Nurse *
                </label>
                <select
                  className="form-control"
                  value={attendingNurseName}
                  onChange={(e) => setAttendingNurseName(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="Nurse Priya Sharma, RN">Nurse Priya Sharma, RN (Daycare Lead)</option>
                  <option value="Nurse Kavita Verma, RN">Nurse Kavita Verma, RN (Observation)</option>
                  <option value="Nurse Emily Vance, RN">Nurse Emily Vance, RN (Triage)</option>
                  <option value="Nurse Marcus Bell, BSN">Nurse Marcus Bell, BSN (Inpatient)</option>
                </select>
              </div>
            </div>

            {/* Stay Duration & Hourly Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Expected Observation Stay (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  className="form-control"
                  value={stayHours}
                  onChange={(e) => setStayHours(Number(e.target.value))}
                  required
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Observation Tariff</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7', marginTop: '0.2rem' }}>
                  ${estimatedCharge}.00
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Rate: ${hourlyRate}/hr in {activeTargetBed?.wardName}
                </div>
              </div>
            </div>

            {/* Clinical Reason */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Clinical Indication / Reason for Observation</label>
              <input
                type="text"
                className="form-control"
                value={reservationNotes}
                onChange={(e) => setReservationNotes(e.target.value)}
                placeholder="e.g. IV Fluid rehydration, asthma nebulization, post-colonoscopy rest"
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}
              >
                <CheckCircle2 size={16} /> Confirm Bed Allocation & Issue Slip
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Slip */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>
                Bed Allocated Successfully!
              </h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Patient admitted to {activeTargetBed?.wardName} ({activeTargetBed?.roomNumber}) for {stayHours} hours observation.
              </p>
            </div>

            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                border: '1.5px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'left',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span>Patient Name:</span>
                <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>UHID:</span>
                <code>{selectedPatient?.uhid}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ward & Bed:</span>
                <strong style={{ color: '#16a34a' }}>{activeTargetBed?.wardName} • {activeTargetBed?.bed.bedNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Room:</span>
                <span>{activeTargetBed?.roomNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attending Doctor:</span>
                <strong>{attendingDoctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Stay:</span>
                <span>{stayHours} Hours</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', fontWeight: 800 }}>
                <span>Total Estimated Charge:</span>
                <span style={{ color: '#0284c7' }}>${estimatedCharge}.00</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
              >
                <Printer size={16} /> Print Admission Slip
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
