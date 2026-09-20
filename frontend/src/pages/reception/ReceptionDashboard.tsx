import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Calendar,
  Search,
  Clock,
  CheckCircle,
  Printer,
  FileText,
  Shield,
  CreditCard,
  Users,
  Phone,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  QrCode,
  Tag,
  Stethoscope,
} from 'lucide-react';
import { Gender, AppointmentType, RoleType } from '../../types';
import { patientJourneyService, SharedPatient, SharedQueueToken } from '../../services/patientJourneyService';
import { getDepartmentTariffMaster } from '../department/departmentWorkspaceStore';

export const ReceptionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'registration' | 'appointments' | 'search'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Sarah Jenkins (Cardiology)');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [showRegModal, setShowRegModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedTokenForPrint, setSelectedTokenForPrint] = useState<any>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any>(null);

  // Registration Form Fields
  const [regFirstName, setRegFirstName] = useState('Alexander');
  const [regLastName, setRegLastName] = useState('Wright');
  const [regPhone, setRegPhone] = useState('+1 555-018-4921');
  const [regDob, setRegDob] = useState('1992-06-18');
  const [regGender, setRegGender] = useState<string>(Gender.MALE);
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regIdType, setRegIdType] = useState('Passport');
  const [regIdNumber, setRegIdNumber] = useState('P99820182C');
  const [regInsurance, setRegInsurance] = useState('BlueCross BlueShield');
  const [regEmergency, setRegEmergency] = useState('Katherine Wright (Mother) • +1 555-018-4922');

  // Registration Wizard Step
  const [regStep, setRegStep] = useState<number>(1);

  // Today's Live Queue (Synchronized with patientJourneyService)
  const [queue, setQueue] = useState<any[]>(() => patientJourneyService.getQueue());

  // Master Patient Directory (Synchronized with patientJourneyService)
  const [patients, setPatients] = useState<SharedPatient[]>(() => patientJourneyService.getPatients());

  // Real-Time Doctor Availability Roster synchronized with Department Tariff Master
  const [tariffMaster, setTariffMaster] = useState(() => getDepartmentTariffMaster('1'));

  useEffect(() => {
    const handleTariffUpdated = () => {
      setTariffMaster(getDepartmentTariffMaster('1'));
    };
    window.addEventListener('north_hospital_dept_tariffs_updated', handleTariffUpdated);
    return () => window.removeEventListener('north_hospital_dept_tariffs_updated', handleTariffUpdated);
  }, []);

  const doctorsRoster = useMemo(() => {
    if (tariffMaster.doctorTariffs && tariffMaster.doctorTariffs.length > 0) {
      return tariffMaster.doctorTariffs.map((dt, idx) => ({
        name: dt.doctorName,
        dept: dt.specialization || 'Clinical Specialist',
        room: `Chamber ${101 + idx}`,
        available: true,
        nextSlot: idx === 0 ? '10:15 AM' : idx === 1 ? '10:30 AM' : idx === 2 ? '11:00 AM' : '02:00 PM',
        fee: dt.standardFee,
        followUpFee: dt.followUpFee || Math.round(dt.standardFee * 0.6),
        emergencyFee: dt.emergencyFee || Math.round(dt.standardFee * 1.5),
      }));
    }
    return [
      { name: 'Dr. Sarah Jenkins', dept: 'Cardiology', room: 'Room 204', available: true, nextSlot: '10:15 AM', fee: 100 },
      { name: 'Dr. Michael Chang', dept: 'General Surgery', room: 'Room 102', available: true, nextSlot: '10:30 AM', fee: 90 },
      { name: 'Dr. Alisha Patel', dept: 'Obstetrics & Gynaecology', room: 'Room 103', available: true, nextSlot: '11:00 AM', fee: 110 },
      { name: 'Harah', dept: 'Associate Consultant', room: 'Chamber 104', available: true, nextSlot: '02:00 PM', fee: 80 },
    ];
  }, [tariffMaster]);

  // Available Time Slots
  const morningSlots = ['09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:30 AM'];
  const afternoonSlots = ['02:00 PM', '02:15 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];

  // Status transitions for queue tokens
  const handleCheckIn = (tokenNo: number) => {
    setQueue((prev) =>
      prev.map((q) => (q.token === tokenNo ? { ...q, status: 'TRIAGED' } : q)),
    );
  };

  const handleCallNext = () => {
    const nextWaiting = queue.find((q) => q.status === 'WAITING' || q.status === 'TRIAGED');
    if (nextWaiting) {
      setQueue((prev) =>
        prev.map((q) => (q.token === nextWaiting.token ? { ...q, status: 'IN_CONSULTATION' } : q)),
      );
      alert(`Token #${nextWaiting.token} (${nextWaiting.patient}) called to ${nextWaiting.room}!`);
    } else {
      alert('All scheduled patients have been called.');
    }
  };

  const handleGenerateToken = (patientName: string, doctorName: string, roomNo: string) => {
    const nextToken = queue.length + 1;
    const newEntry = {
      token: nextToken,
      aptNo: `APT-20260915-${String(nextToken).padStart(4, '0')}`,
      uhid: `UHID-202609-${String(nextToken).padStart(5, '0')}`,
      patient: patientName,
      phone: '+1 555-010-9999',
      doctor: doctorName,
      room: roomNo,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'WALK_IN',
      status: 'WAITING',
    };
    setQueue([...queue, newEntry]);
    setSelectedTokenForPrint(newEntry);
    setShowTokenModal(true);
  };

  const filteredQueue = queue.filter(
    (q) =>
      q.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(q.token) === searchQuery,
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery),
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="page-title">Reception & Front Desk Station</h2>
              <p className="page-subtitle">
                Patient onboarding wizard, live token queue, doctor slots & universal directory
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleCallNext}>
            <Clock size={16} /> Call Next in Line
          </button>
          <button className="btn btn-primary" onClick={() => setShowRegModal(true)}>
            <UserPlus size={18} /> Register New Patient
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Summary Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="stat-value">{queue.length}</div>
              <div className="stat-label">Total Visits Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{queue.filter((q) => q.status === 'WAITING').length}</div>
              <div className="stat-label">Waiting in OPD Lobby</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="stat-value">{queue.filter((q) => q.status === 'IN_CONSULTATION').length}</div>
              <div className="stat-label">Currently in Consultation</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--secondary)' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div className="stat-value">12</div>
              <div className="stat-label">Scheduled Appointments</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <Clock size={18} /> Live Token Queue & Check-In
          </button>
          <button
            className={`tab-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar size={18} /> Appointment Scheduling & Slots
          </button>
          <button
            className={`tab-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} /> Patient Directory & History
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="filter-bar">
          <div className="search-input-box" style={{ minWidth: '350px' }}>
            <Search size={18} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search by Patient Name, UHID, Phone, Doctor or Token #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'queue' && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className="badge badge-info">Desk #1 Active</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleGenerateToken('Walk-in Patient', 'Dr. Sarah Jenkins (Cardiology)', 'Room 204')}
              >
                <Tag size={14} /> Issue Quick Walk-In Token
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: Live Token Queue */}
        {activeTab === 'queue' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Today's Live OPD Queue Desk (Sep 15, 2026)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Real-time synchronization between Front Desk, Nurse Triage, and Doctor Chambers
                </p>
              </div>
              <span className="badge badge-info">{filteredQueue.length} Active Tokens</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Appointment No</th>
                    <th>Patient Name & UHID</th>
                    <th>Doctor & Room</th>
                    <th>Time Slot</th>
                    <th>Visit Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((q) => (
                    <tr key={q.token}>
                      <td>
                        <span
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 800,
                            color: q.status === 'IN_CONSULTATION' ? 'var(--primary)' : 'var(--secondary)',
                          }}
                        >
                          #{String(q.token).padStart(2, '0')}
                        </span>
                      </td>

                      <td><code>{q.aptNo}</code></td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{q.patient}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {q.uhid} • {q.phone}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>{q.doctor}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{q.room}</div>
                      </td>

                      <td>{q.time}</td>

                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {q.type}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            q.status === 'IN_CONSULTATION'
                              ? 'badge-danger'
                              : q.status === 'TRIAGED'
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                        >
                          {q.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedTokenForPrint(q);
                              setShowTokenModal(true);
                            }}
                            title="Print Token Slip"
                          >
                            <Printer size={14} /> Slip
                          </button>

                          {q.status === 'WAITING' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleCheckIn(q.token)}
                            >
                              Check-In
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Appointment Scheduling & Slots */}
        {activeTab === 'appointments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
            {/* Left: Doctor Availability Roster */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Consultant Availability Roster
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Select doctor to preview open consultation slots
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {doctorsRoster.map((doc, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedDoctor(`${doc.name} (${doc.dept})`)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${selectedDoctor.includes(doc.name) ? 'var(--primary)' : 'var(--border-color)'}`,
                      backgroundColor: selectedDoctor.includes(doc.name) ? 'var(--primary-light)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                        {doc.name}
                      </div>
                      <span className={`badge ${doc.available ? 'badge-success' : 'badge-secondary'}`}>
                        {doc.available ? 'Available' : 'In Surgery'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {doc.dept} • {doc.room} • Consultation Fee: <strong>${doc.fee}</strong>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.5rem' }}>
                      Next Open Slot: {doc.nextSlot}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Slot Booking Console */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Book Slot for {selectedDoctor}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Date: Tuesday, Sep 15, 2026 • Real-time slot allocation
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Patient UHID / Name *</label>
                <input type="text" className="form-input" defaultValue="Eleanor Vance (UHID-202609-00002)" />
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Category *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Scheduled Visit', 'Walk-In', 'Follow-Up', 'Second Opinion'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`subtab-pill ${cat === 'Scheduled Visit' ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Morning Slots (09:00 AM - 12:00 PM)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {morningSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: selectedSlot === slot ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: selectedSlot === slot ? '#ffffff' : 'var(--text-main)',
                        cursor: 'pointer',
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Afternoon Slots (02:00 PM - 05:00 PM)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {afternoonSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: selectedSlot === slot ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: selectedSlot === slot ? '#ffffff' : 'var(--text-main)',
                        cursor: 'pointer',
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selected Time Slot</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedSlot} with {selectedDoctor.split(' ')[1]}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => alert(`Appointment confirmed for ${selectedSlot}! SMS reminder sent to patient.`)}
                >
                  <Calendar size={16} /> Confirm Booking & Generate Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Universal Patient Search & History */}
        {activeTab === 'search' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Hospital Master Patient Directory ({filteredPatients.length})
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Comprehensive demographic records, identity verifications & lifetime medical history
                </p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>UHID</th>
                    <th>Patient Full Name</th>
                    <th>Age / Gender</th>
                    <th>Phone Number</th>
                    <th>Identity Card</th>
                    <th>Insurance Provider</th>
                    <th>Visits</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.uhid}>
                      <td><code>{p.uhid}</code></td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Blood: {p.bloodGroup}</div>
                      </td>
                      <td>{p.age}Y • {p.gender}</td>
                      <td>{p.phone}</td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.idType}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{p.idNumber}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {p.insurance.split('•')[0]}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{p.visitsCount} Past Visits</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPatientHistory(p)}
                        >
                          <FileText size={14} /> Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Printable Token Slip */}
      {showTokenModal && selectedTokenForPrint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ borderBottom: '2px dashed var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>NORTH HOSPITAL</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Enterprise HMS • OPD Reception</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>Date: {new Date().toLocaleDateString()} {selectedTokenForPrint.time}</p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                OPD Token Number
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary-hover)', lineHeight: 1 }}>
                #{String(selectedTokenForPrint.token).padStart(2, '0')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', fontSize: '0.8125rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <strong>{selectedTokenForPrint.patient}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>UHID:</span>
                <code>{selectedTokenForPrint.uhid}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consultant:</span>
                <strong>{selectedTokenForPrint.doctor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Chamber:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{selectedTokenForPrint.room}</span>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTokenModal(false)}>
                Close
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  window.print();
                  setShowTokenModal(false);
                }}
              >
                <Printer size={14} /> Print Token Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Patient Registration Wizard (6 Steps) */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Patient Registration Wizard</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Step {regStep} of 4: {regStep === 1 ? 'Personal & Demographics' : regStep === 2 ? 'Identity & Emergency Contact' : regStep === 3 ? 'Insurance & TPA' : 'Consent & Treatment Authorization'}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRegModal(false)}>✕</button>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '4px',
                    backgroundColor: regStep >= step ? 'var(--primary)' : 'var(--border-color)',
                    transition: 'var(--transition)',
                  }}
                />
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (regStep < 4) {
                  setRegStep(regStep + 1);
                } else {
                  // Generate UHID and save patient
                  const uhidNumber = `UHID-202609-${String(patients.length + 1).padStart(5, '0')}`;
                  const birthYear = new Date(regDob).getFullYear();
                  const age = Math.max(18, isNaN(birthYear) ? 32 : new Date().getFullYear() - birthYear);

                  const newPatient: SharedPatient = {
                    uhid: uhidNumber,
                    firstName: regFirstName,
                    lastName: regLastName,
                    phone: regPhone,
                    dob: regDob,
                    age,
                    gender: regGender,
                    bloodGroup: regBloodGroup,
                    idType: regIdType,
                    idNumber: regIdNumber,
                    emergencyContact: regEmergency,
                    insurance: regInsurance,
                    visitsCount: 1,
                    outstandingDue: 0.0,
                    recentVisits: [
                      { date: new Date().toISOString().split('T')[0], doctor: 'Dr. Sarah Jenkins', dept: 'Cardiology', diagnosis: 'New Patient OPD Evaluation' },
                    ],
                  };
                  patientJourneyService.registerPatient(newPatient);
                  setPatients(patientJourneyService.getPatients());

                  // Create OPD queue token so the doctor station immediately sees this patient
                  const nextToken = queue.length + 1;
                  const newToken: SharedQueueToken = {
                    id: `apt-${String(nextToken).padStart(3, '0')}`,
                    token: nextToken,
                    aptNo: `APT-20260915-${String(nextToken).padStart(4, '0')}`,
                    uhid: uhidNumber,
                    patient: `${regFirstName} ${regLastName}`,
                    age,
                    gender: regGender,
                    bloodGroup: regBloodGroup,
                    phone: regPhone,
                    doctor: 'Dr. Sarah Jenkins (Cardiology)',
                    room: 'Room 204',
                    time: '10:00 AM',
                    type: 'WALK_IN',
                    status: 'TRIAGED',
                    vitals: {
                      bp: '124/80',
                      pulse: 78,
                      temp: 98.6,
                      spo2: 99,
                      height: 175,
                      weight: 72,
                      bmi: 23.5,
                      triageNotes: 'Newly registered patient. Consultation token active.',
                    },
                  };
                  patientJourneyService.addQueueToken(newToken);
                  setQueue(patientJourneyService.getQueue());
                  setSelectedTokenForPrint(newToken);

                  setShowRegModal(false);
                  setShowTokenModal(true);
                  setRegStep(1);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {/* STEP 1: Personal Demographics */}
              {regStep === 1 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Date of Birth *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender *</label>
                      <select
                        className="form-select"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
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
                        value={regBloodGroup}
                        onChange={(e) => setRegBloodGroup(e.target.value)}
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Marital Status</label>
                      <select className="form-select" defaultValue="Single">
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Family Link (Existing UHID)</label>
                      <input type="text" className="form-input" placeholder="e.g. UHID-202609-00001 (Optional)" />
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Identity & Emergency Contacts */}
              {regStep === 2 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Primary Mobile Phone *</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-input" defaultValue="alexander.w@example.com" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Govt Identity Type *</label>
                      <select
                        className="form-select"
                        value={regIdType}
                        onChange={(e) => setRegIdType(e.target.value)}
                      >
                        <option value="Passport">Passport</option>
                        <option value="Driver License">Driver License</option>
                        <option value="National ID">National ID / Aadhaar</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Identity Document Number *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={regIdNumber}
                        onChange={(e) => setRegIdNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Emergency Contact Name & Relation *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={regEmergency}
                      onChange={(e) => setRegEmergency(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* STEP 3: Insurance & TPA */}
              {regStep === 3 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Insurance Provider / TPA</label>
                      <select
                        className="form-select"
                        value={regInsurance}
                        onChange={(e) => setRegInsurance(e.target.value)}
                      >
                        <option value="None">Self Pay (Cash)</option>
                        <option value="BlueCross BlueShield">BlueCross BlueShield</option>
                        <option value="Aetna Global">Aetna Global</option>
                        <option value="United HealthCare">United HealthCare</option>
                        <option value="Cigna Health">Cigna Health</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Policy / Member ID Number</label>
                      <input type="text" className="form-input" defaultValue="BCBS-902189-A" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Corporate / Group Sponsor</label>
                      <input type="text" className="form-input" defaultValue="TechCorp Enterprise Ltd." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pre-Authorization Status</label>
                      <select className="form-select" defaultValue="Pre-Approved">
                        <option value="Pre-Approved">Pre-Approved</option>
                        <option value="Pending Submission">Pending Submission</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 4: Consent & Authorization */}
              {regStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                    <strong>General Hospital Treatment Consent:</strong>
                    <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                      I hereby authorize North Hospital medical staff to administer examinations, diagnostic procedures, and treatments as considered necessary. I consent to medical record digitization and insurance data sharing.
                    </p>
                  </div>

                  <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                    <input type="checkbox" defaultChecked required />
                    Patient / Guardian has signed General OPD Consent Form
                  </label>

                  <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                    <input type="checkbox" defaultChecked required />
                    Privacy Notice & HIPAA / Patient Data Protection Acknowledged
                  </label>
                </div>
              )}


              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                {regStep > 1 ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setRegStep(regStep - 1)}>
                    Back
                  </button>
                ) : (
                  <div></div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRegModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {regStep < 4 ? 'Continue Next Step' : 'Generate UHID & Register'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Patient Dossier / Historical Visits */}
      {selectedPatientHistory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Patient Dossier — {selectedPatientHistory.firstName} {selectedPatientHistory.lastName}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedPatientHistory.uhid} • {selectedPatientHistory.age}Y • {selectedPatientHistory.gender}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPatientHistory(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                <div><strong>Phone:</strong> {selectedPatientHistory.phone}</div>
                <div><strong>Blood Group:</strong> {selectedPatientHistory.bloodGroup}</div>
                <div><strong>Insurance:</strong> {selectedPatientHistory.insurance.split('•')[0]}</div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                  Episode & Visit History ({selectedPatientHistory.recentVisits.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedPatientHistory.recentVisits.map((v: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.875rem' }}>
                        <span>{v.dept} — {v.doctor}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v.date}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                        Diagnosis: {v.diagnosis}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedPatientHistory(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
