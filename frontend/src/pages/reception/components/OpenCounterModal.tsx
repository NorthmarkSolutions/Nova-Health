import React, { useState } from 'react';
import {
  X,
  LockOpen,
  DollarSign,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DailyCounterSession, patientJourneyService } from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSession: DailyCounterSession;
  onSessionUpdated: (session: DailyCounterSession) => void;
}

export const OpenCounterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSession,
  onSessionUpdated,
}) => {
  if (!isOpen) return null;

  const [counterNumber, setCounterNumber] = useState(currentSession.counterNumber || 'Desk #1');
  const [receptionistName, setReceptionistName] = useState(currentSession.receptionistName || 'Emma FrontDesk');
  const [shift, setShift] = useState(currentSession.shift || 'Morning Shift (08:00 - 16:00)');
  const [openingFloat, setOpeningFloat] = useState(currentSession.openingFloat || 150.0);
  const [notes, setNotes] = useState('Opening drawer checked. Printer paper and thermal rolls stocked.');

  const handleOpenCounter = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = patientJourneyService.openCounterSession({
      counterNumber,
      receptionistName,
      shift,
      openingFloat: Number(openingFloat),
      notes,
    });
    onSessionUpdated(updated);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
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
              <LockOpen size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Open Daily Reception Counter
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Start new cashier shift, verify opening cash float & activate OPD desk
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

        <form onSubmit={handleOpenCounter} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Counter / Desk Station *</label>
              <select
                className="form-select"
                value={counterNumber}
                onChange={(e) => setCounterNumber(e.target.value)}
                style={{ fontWeight: 700 }}
              >
                <option value="Desk #1">Desk #1 - Main OPD Lobby</option>
                <option value="Desk #2">Desk #2 - Fast-Track Walk-in</option>
                <option value="Desk #3">Desk #3 - Appointments & Billing</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Active Receptionist *</label>
              <input
                type="text"
                className="form-input"
                value={receptionistName}
                onChange={(e) => setReceptionistName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duty Shift *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                'Morning Shift (08:00 - 16:00)',
                'Evening Shift (16:00 - 00:00)',
                'Night Emergency',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`subtab-pill ${shift === s ? 'active' : ''}`}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
                >
                  {s.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Opening Float Box */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <label className="form-label" style={{ margin: 0, color: 'var(--secondary)' }}>
              Opening Cash Float in Drawer ($) *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="number"
                min="0"
                step="10"
                className="form-input"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Number(e.target.value))}
                style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0284c7', maxWidth: '140px' }}
                required
              />
              <span style={{ fontSize: '0.7813rem', color: 'var(--text-muted)' }}>
                Physical petty cash count in cashier till at shift commencement
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Shift Notes / Equipment Checklist</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}
            >
              <CheckCircle2 size={16} /> Open Shift & Start Desk Operations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
