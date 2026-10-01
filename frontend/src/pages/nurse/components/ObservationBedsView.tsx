import React, { useState } from 'react';
import { BedDouble, UserCheck, Plus, ShieldAlert } from 'lucide-react';
import { NurseObservationBed } from '../../../services/patientJourneyService';

interface ObservationBedsViewProps {
  beds: NurseObservationBed[];
  onAddTelemetry: (bedId: string, reading: any) => void;
  onDischargeBed: (bedId: string) => void;
  onEscalateBed: (bedId: string) => void;
}

export const ObservationBedsView: React.FC<ObservationBedsViewProps> = ({
  beds,
  onAddTelemetry,
  onDischargeBed,
  onEscalateBed,
}) => {
  const [selectedBedId, setSelectedBedId] = useState<string>(beds[0]?.id || '');
  const selectedBed = beds.find((b) => b.id === selectedBedId) || beds[0] || null;

  // New telemetry reading modal/inline form state
  const [bp, setBp] = useState('125/82');
  const [pulse, setPulse] = useState('76');
  const [spo2, setSpo2] = useState('98');
  const [temp, setTemp] = useState('98.8');
  const [nurseNotes, setNurseNotes] = useState('Patient comfortable, IV drip infusing normally.');

  const handleRecordReading = () => {
    if (!selectedBed) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    onAddTelemetry(selectedBed.id, {
      time: timeStr,
      bp,
      pulse: Number(pulse) || 76,
      spo2: Number(spo2) || 98,
      temp: Number(temp) || 98.8,
      pain: 0,
      response: 'Stable',
      note: nurseNotes,
    });
    setNurseNotes('');
  };

  return (
    <div className="nurse-beds-layout">
      {/* LEFT COLUMN: OBSERVATION BEDS ROSTER (§ 8: 12px Radius Cards) */}
      <div className="card" style={{ padding: '20px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BedDouble size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--secondary)', margin: 0 }}>
              Day-Care Beds
            </h2>
          </div>
          <span className="badge badge-info">{beds.length} Active</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {beds.map((bed) => {
            const isSelected = bed.id === selectedBed?.id;
            const isEscalated = bed.status === 'ESCALATED';
            return (
              <div
                key={bed.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBedId(bed.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedBedId(bed.id);
                  }
                }}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: isSelected ? 'var(--primary)' : 'var(--secondary)',
                      fontSize: '14px',
                    }}
                  >
                    {bed.bedNumber}
                  </span>
                  <span
                    className={`badge ${
                      isEscalated
                        ? 'badge-danger'
                        : bed.status === 'ACTIVE'
                        ? 'badge-warning'
                        : 'badge-secondary'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginTop: '4px',
                  }}
                >
                  {bed.patientName}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {bed.uhid} • In: {bed.startTime}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: BED TELEMETRY & SERIAL LOG (§ 8 & § 10) */}
      {selectedBed ? (
        <div className="card" style={{ padding: '24px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Bed Info Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--gray-50)',
              border: '1px solid var(--border-color)',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedBed.bedNumber}
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--secondary)' }}>
                  {selectedBed.patientName}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  ({selectedBed.uhid})
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Admitted for Day-Care Observation at <strong>{selectedBed.startTime}</strong> • Reason:{' '}
                <strong style={{ color: 'var(--text-main)' }}>{selectedBed.diagnosis || 'Clinical Observation'}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onEscalateBed(selectedBed.id)}
                title="Escalate bed care to Inpatient Ward or ER"
              >
                <ShieldAlert size={14} color="var(--danger)" /> Escalate
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onDischargeBed(selectedBed.id)}
                title="Discharge patient from day-care observation"
              >
                <UserCheck size={14} /> Discharge
              </button>
            </div>
          </div>

          {/* Record Quick Vital Reading Form (§ 11) */}
          <div style={{ marginBottom: '24px' }}>
            <h4
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--secondary)',
                marginBottom: '12px',
                margin: 0,
              }}
            >
              Record Serial Vitals Reading
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginTop: '12px',
                marginBottom: '12px',
              }}
            >
              <div className="form-group">
                <label className="form-label">BP (mmHg)</label>
                <input
                  type="text"
                  className="form-input"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pulse (bpm)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">SpO2 (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Clinical observations, infusion rate, response to analgesia..."
                value={nurseNotes}
                onChange={(e) => setNurseNotes(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleRecordReading}>
                <Plus size={16} /> Log Vital
              </button>
            </div>
          </div>

          {/* Serial Telemetry Log Table (§ 10: 56px rows, clean borders) */}
          <div>
            <h4
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--secondary)',
                marginBottom: '12px',
                margin: 0,
              }}
            >
              Serial Telemetry Flowsheet
            </h4>
            <div className="table-container" style={{ marginTop: '12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Blood Pressure</th>
                    <th>Pulse</th>
                    <th>SpO2</th>
                    <th>Temp</th>
                    <th>Observations & Nurse Sign-off</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBed.readings && selectedBed.readings.length > 0 ? (
                    selectedBed.readings.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{r.time}</td>
                        <td>{r.bp}</td>
                        <td>{r.pulse} bpm</td>
                        <td>
                          <span
                            className={`badge ${
                              r.spo2 >= 95 ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {r.spo2}%
                          </span>
                        </td>
                        <td>{r.temp} °F</td>
                        <td style={{ color: 'var(--text-muted)' }}>{r.note || 'Routine vitals normal'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No serial readings recorded yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No observation bed selected.
        </div>
      )}
    </div>
  );
};
