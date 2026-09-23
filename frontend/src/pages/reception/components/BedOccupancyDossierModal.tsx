import React, { useState } from 'react';
import {
  X,
  BedDouble,
  User,
  Clock,
  DollarSign,
  HeartPulse,
  Activity,
  Stethoscope,
  ShieldAlert,
  LogOut,
  ArrowRightLeft,
  Printer,
  CheckCircle2,
  Building2,
  Calendar,
  Phone,
  FileText,
} from 'lucide-react';
import {
  BedNode,
  InpatientCareDetails,
} from '../../../pages/admin/setup/organization/CampusInfrastructureSection';
import { FlatCampusBed, patientJourneyService } from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bedItem: FlatCampusBed | null;
  onBedDischarged: (bedId: string) => void;
  onBedTransferred?: (sourceBedId: string, targetBedId: string) => void;
}

export const BedOccupancyDossierModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bedItem,
  onBedDischarged,
  onBedTransferred,
}) => {
  if (!isOpen || !bedItem || !bedItem.bed.inpatientDetails) return null;

  const { bed, wardName, roomNumber, buildingName, floorName, wardId, buildingId, floorId } = bedItem;
  const pt: InpatientCareDetails = bed.inpatientDetails;

  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedTargetBedId, setSelectedTargetBedId] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Calculate elapsed time & accrued charges
  const calculateStay = () => {
    if (!pt.admissionDate) {
      return { elapsedHours: 2, formattedDate: 'Today, 09:30 AM', accrued: 40, hourlyRate: 20 };
    }
    const admitTime = new Date(pt.admissionDate.replace(' ', 'T'));
    const now = new Date();
    const diffMs = !isNaN(admitTime.getTime()) ? Math.max(0, now.getTime() - admitTime.getTime()) : 7200000;
    const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const hourlyRate = bed.dailyTariff > 0 ? Math.round(bed.dailyTariff / 8) : 20;
    const accrued = diffHours * (hourlyRate || 20);

    const formattedDate = !isNaN(admitTime.getTime())
      ? admitTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) +
        ', ' +
        admitTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : pt.admissionDate;

    return { elapsedHours: diffHours, formattedDate, accrued, hourlyRate };
  };

  const stayInfo = calculateStay();

  // Find all available beds for transfer
  const allBeds = patientJourneyService.getFlatBedsList();
  const availableBeds = allBeds.filter(
    (b) => b.bed.id !== bed.id && b.bed.status === 'AVAILABLE' && b.bed.cleanlinessStatus !== 'NEEDS_CLEANING'
  );

  const handleConfirmDischarge = () => {
    if (
      window.confirm(
        `Are you sure you want to discharge ${pt.patientName} from ${bed.bedNumber}? Bed will be moved to housekeeping for sanitization.`
      )
    ) {
      patientJourneyService.dischargeCampusBed(buildingId, floorId, wardId, bed.id);
      onBedDischarged(bed.id);
      onClose();
    }
  };

  const handleConfirmTransfer = () => {
    if (!selectedTargetBedId) {
      alert('Please select a target vacant bed.');
      return;
    }
    const targetBed = allBeds.find((b) => b.bed.id === selectedTargetBedId);
    if (
      window.confirm(
        `Transfer ${pt.patientName} from ${bed.bedNumber} to ${targetBed?.bed.bedNumber || 'selected bed'}?`
      )
    ) {
      patientJourneyService.transferCampusBed(bed.id, selectedTargetBedId);
      if (onBedTransferred) {
        onBedTransferred(bed.id, selectedTargetBedId);
      }
      onBedDischarged(bed.id);
      onClose();
    }
  };

  const handlePrintSlip = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          width: '92vw',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <BedDouble size={24} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                  {bed.bedNumber}
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                  }}
                >
                  🔴 OCCUPIED
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: '#e2e8f0',
                  }}
                >
                  {bed.bedType}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                {wardName} • {roomNumber} ({floorName} • {buildingName})
              </p>
            </div>
          </div>

          <button
            type="button"
            className="action-btn"
            onClick={onClose}
            style={{
              color: '#94a3b8',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* PATIENT IDENTITY CARD */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                }}
              >
                {pt.patientName.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--secondary)' }}>
                    {pt.patientName}
                  </h4>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                    }}
                  >
                    {pt.uhid}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Age: <strong>{pt.age} yrs</strong></span>
                  <span>•</span>
                  <span>Gender: <strong>{pt.gender}</strong></span>
                  {pt.ipdAdmissionNo && (
                    <>
                      <span>•</span>
                      <span>Encounter: <strong>{pt.ipdAdmissionNo}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Acuity & Admission Time */}
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: pt.acuity === 'CRITICAL' ? '#fee2e2' : pt.acuity === 'GUARDED' ? '#fef3c7' : '#dcfce7',
                  color: pt.acuity === 'CRITICAL' ? '#991b1b' : pt.acuity === 'GUARDED' ? '#b45309' : '#15803d',
                }}
              >
                ACUITY: {pt.acuity || 'OBSERVATION'}
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                <Clock size={13} />
                <span>Admitted: {stayInfo.formattedDate}</span>
              </div>
            </div>
          </div>

          {/* CLINICAL INDICATION & DIAGNOSIS */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b45309', fontWeight: 800, fontSize: '0.8125rem' }}>
              <FileText size={15} /> PRIMARY CLINICAL INDICATION & OBSERVATION REASON
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9375rem', fontWeight: 700, color: '#92400e' }}>
              {pt.diagnosis || 'Post-consultation vital stabilization & continuous symptom observation'}
            </p>
          </div>

          {/* 3-PILLAR CLINICAL GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Lead Doctor */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Stethoscope size={14} color="#0284c7" /> ATTENDING CONSULTANT
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--secondary)', marginTop: '0.35rem' }}>
                {pt.primaryDoctor?.name || 'Dr. Sarah Jenkins'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                {pt.primaryDoctor?.specialty || 'General Medicine'}
              </div>
            </div>

            {/* Supervising Nurse */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <HeartPulse size={14} color="#16a34a" /> IN-CHARGE CARE NURSE
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--secondary)', marginTop: '0.35rem' }}>
                {pt.primaryNurse?.name || 'Nurse Priya Sharma, RN'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                {pt.primaryNurse?.shift || 'Morning Shift'}
              </div>
            </div>

            {/* Tariff & Duration */}
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <DollarSign size={14} color="#16a34a" /> ACCRUED DAYCARE CHARGE
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.125rem', color: '#15803d', marginTop: '0.25rem' }}>
                ${stayInfo.accrued}.00
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ${stayInfo.hourlyRate}/hr • {stayInfo.elapsedHours} hr(s) elapsed
              </div>
            </div>
          </div>

          {/* VITALS PANEL */}
          {pt.vitals && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={14} color="#dc2626" /> RECENT OBSERVATION VITALS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700 }}>BP</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--secondary)' }}>{pt.vitals.bp || '120/80'}</div>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700 }}>PULSE</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#16a34a' }}>{pt.vitals.pulse || '76'} <span style={{ fontSize: '0.65rem' }}>bpm</span></div>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700 }}>SPO2</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0284c7' }}>{pt.vitals.spo2 || '98%'}</div>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700 }}>TEMP</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#d97706' }}>{pt.vitals.temp || '98.6 °F'}</div>
                </div>
              </div>
            </div>
          )}

          {/* TRANSFER ACCORDION IF CLICKED */}
          {isTransferring && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ArrowRightLeft size={16} /> Select Destination Vacant Bed:
                </strong>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsTransferring(false)}
                  style={{ fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              </div>

              {availableBeds.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#dc2626' }}>
                  No available vacant beds currently found in the hospital campus.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    value={selectedTargetBedId}
                    onChange={(e) => setSelectedTargetBedId(e.target.value)}
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    <option value="">— Select Target Vacant Bed —</option>
                    {availableBeds.map((ab) => (
                      <option key={ab.bed.id} value={ab.bed.id}>
                        {ab.bed.bedNumber} ({ab.wardName} • {ab.roomNumber}) — ${ab.bed.dailyTariff}/24h
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedTargetBedId}
                    onClick={handleConfirmTransfer}
                    style={{ fontWeight: 800 }}
                  >
                    Confirm Bed Transfer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrintSlip}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.8125rem' }}
            >
              <Printer size={15} /> Print Bed Tag Slip
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTransferring(!isTransferring)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.8125rem' }}
            >
              <ArrowRightLeft size={15} /> Transfer Bed
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontWeight: 700, fontSize: '0.8125rem' }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleConfirmDischarge}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 800,
                fontSize: '0.8125rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LogOut size={15} /> Vacate & Discharge Bed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
