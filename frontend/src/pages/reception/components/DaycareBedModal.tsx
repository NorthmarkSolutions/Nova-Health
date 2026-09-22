import React, { useState } from 'react';
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
} from 'lucide-react';
import { SharedPatient, SharedQueueToken } from '../../../services/patientJourneyService';
import { DepartmentTariffMaster } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tariffMaster: DepartmentTariffMaster;
  existingPatients: SharedPatient[];
  activeTokens: SharedQueueToken[];
}

export const DaycareBedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tariffMaster,
  existingPatients,
  activeTokens,
}) => {
  if (!isOpen) return null;

  const [selectedPatientUhid, setSelectedPatientUhid] = useState(
    activeTokens[0]?.uhid || existingPatients[0]?.uhid || ''
  );
  const [selectedWardId, setSelectedWardId] = useState(tariffMaster.wardTariffs[0]?.wardId || 'ward-opd-obs');
  const [stayHours, setStayHours] = useState(4);
  const [reservationNotes, setReservationNotes] = useState('Short-stay IV infusion & vitals stabilization');
  const [isReserved, setIsReserved] = useState(false);
  const [bedNumber, setBedNumber] = useState('Bed-04');

  const selectedWard =
    tariffMaster.wardTariffs.find((w) => w.wardId === selectedWardId) || tariffMaster.wardTariffs[0];
  const selectedPatient =
    existingPatients.find((p) => p.uhid === selectedPatientUhid) || existingPatients[0];

  const hourlyRate = selectedWard?.hourlyRate || 15;
  const estimatedCharge = hourlyRate * stayHours;

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReserved(true);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '620px',
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
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Daycare & Observation Bed Booking
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Allocate temporary observation beds for vitals monitoring, IV therapy & daycare procedures
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
            {/* Patient Selection */}
            <div className="form-group">
              <label className="form-label">Select Patient for Observation *</label>
              <select
                className="form-select"
                value={selectedPatientUhid}
                onChange={(e) => setSelectedPatientUhid(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {existingPatients.map((p) => (
                  <option key={p.uhid} value={p.uhid}>
                    {p.firstName} {p.lastName} ({p.uhid}) • {p.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Ward & Bed Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Department Observation Ward *</label>
                <select
                  className="form-select"
                  value={selectedWardId}
                  onChange={(e) => setSelectedWardId(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {tariffMaster.wardTariffs.map((w) => (
                    <option key={w.wardId} value={w.wardId}>
                      {w.wardName} ({w.totalBeds} Beds) — ${w.hourlyRate || 15}/hr
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Assigned Bed</label>
                <select
                  className="form-select"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  style={{ fontWeight: 700, color: '#16a34a' }}
                >
                  <option value="Bed-01">Bed #01 (Available)</option>
                  <option value="Bed-02">Bed #02 (Available)</option>
                  <option value="Bed-04">Bed #04 (Available)</option>
                  <option value="Bed-06">Bed #06 (Available)</option>
                </select>
              </div>
            </div>

            {/* Stay Duration & Hourly Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Expected Stay Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  className="form-input"
                  value={stayHours}
                  onChange={(e) => setStayHours(Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Observation Tariff</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7', marginTop: '0.2rem' }}>
                  ${estimatedCharge}.00
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Based on ${hourlyRate}/hr rate in {selectedWard?.wardName}
                </div>
              </div>
            </div>

            {/* Clinical Reason */}
            <div className="form-group">
              <label className="form-label">Clinical Indication / Doctor Notes</label>
              <input
                type="text"
                className="form-input"
                value={reservationNotes}
                onChange={(e) => setReservationNotes(e.target.value)}
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
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>
                Bed Allocated Successfully!
              </h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Patient admitted to {selectedWard?.wardName} for {stayHours} hours observation.
              </p>
            </div>

            <div
              style={{
                width: '100%',
                maxWidth: '420px',
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
                <strong style={{ color: '#16a34a' }}>{selectedWard?.wardName} • {bedNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Stay:</span>
                <span>{stayHours} Hours</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', fontWeight: 800 }}>
                <span>Total Charge:</span>
                <span style={{ color: '#0284c7' }}>${estimatedCharge}.00</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} /> Print Admission Slip
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
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
