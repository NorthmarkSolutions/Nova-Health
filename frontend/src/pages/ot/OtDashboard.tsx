import React, { useState } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BedDouble,
  Receipt,
  Plus,
  Search,
  CheckCircle,
  ShieldCheck,
  Activity,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { SurgeryBooking, SurgeryStatus, RoleType } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const OtDashboard: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedule' | 'checklist' | 'postop' | 'equipment'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SurgeryBooking | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Initial OT Schedule Data
  const [surgeries, setSurgeries] = useState<SurgeryBooking[]>([
    {
      id: 'ot-001',
      surgeryCode: 'SURG-202609-001',
      surgeryName: 'Laparoscopic Cholecystectomy',
      surgeryType: 'General / Minimally Invasive',
      patientId: 'p-001',
      patientName: 'Robert Fox',
      uhid: 'UHID-202609-00001',
      age: 38,
      gender: 'MALE',
      surgeonName: 'Dr. Michael Chang, MS (Gen Surg)',
      assistantSurgeon: 'Dr. Priya Nair',
      anesthetistName: 'Dr. Kevin Vance, MD (Anesth)',
      otRoom: 'OT-1 (Major Modular)',
      scheduledDate: '2026-09-15',
      scheduledTime: '10:30 AM',
      durationMinutes: 90,
      status: SurgeryStatus.IN_PROGRESS,
      nursingTeam: ['Staff Nurse Sarah (Scrub)', 'Staff Nurse David (Circulating)'],
      equipmentAssigned: ['Karl Storz 4K Laparoscopic Tower', 'Harmonic Scalpel Gen11', 'Bovie Cautery'],
      preOpAssessmentNote: 'PAC Cleared Grade II. Fasting 8 hours verified. Blood group O+ 2 units crossmatched on hold.',
      postOpNotes: 'Gallbladder excised with 4-port technique. Minimal blood loss (<50ml). Specimen sent for histopathology.',
      consentFormSigned: true,
      pacCleared: true,
      npoStatusHours: 8,
      estimatedCost: 1850.0,
    },
    {
      id: 'ot-002',
      surgeryCode: 'SURG-202609-002',
      surgeryName: 'Total Knee Arthroplasty (Right)',
      surgeryType: 'Orthopedic / Major',
      patientId: 'p-002',
      patientName: 'Eleanor Vance',
      uhid: 'UHID-202609-00002',
      age: 62,
      gender: 'FEMALE',
      surgeonName: 'Dr. Jonathan Reed, MCh (Ortho)',
      assistantSurgeon: 'Dr. Amit Patel',
      anesthetistName: 'Dr. Kevin Vance, MD (Anesth)',
      otRoom: 'OT-2 (Laminar Flow Ortho)',
      scheduledDate: '2026-09-15',
      scheduledTime: '01:00 PM',
      durationMinutes: 120,
      status: SurgeryStatus.PRE_OP_ASSESSED,
      nursingTeam: ['Staff Nurse Anita (Scrub)', 'Staff Nurse George (Circulating)'],
      equipmentAssigned: ['Stryker Ortho Power Tools', 'Siemens C-Arm Fluoroscope', 'Pneumatic Tourniquet'],
      preOpAssessmentNote: 'PAC Cleared Grade I. Epidural catheter placed for post-op analgesia. Implant Stryker Triathlon verified.',
      consentFormSigned: true,
      pacCleared: true,
      npoStatusHours: 10,
      estimatedCost: 3200.0,
    },
    {
      id: 'ot-003',
      surgeryCode: 'SURG-202609-003',
      surgeryName: 'Emergency Appendectomy',
      surgeryType: 'Emergency / General',
      patientId: 'p-003',
      patientName: 'Marcus Brody',
      uhid: 'UHID-202609-00003',
      age: 29,
      gender: 'MALE',
      surgeonName: 'Dr. Michael Chang, MS (Gen Surg)',
      assistantSurgeon: 'Dr. Priya Nair',
      anesthetistName: 'Dr. Elena Rostova, MD',
      otRoom: 'OT-3 (Emergency / Trauma)',
      scheduledDate: '2026-09-15',
      scheduledTime: '03:45 PM',
      durationMinutes: 60,
      status: SurgeryStatus.PLANNED,
      nursingTeam: ['Staff Nurse Linda (Scrub)', 'Staff Nurse Sam (Circulating)'],
      equipmentAssigned: ['Laparoscopy Setup', 'Suction Irrigation Unit'],
      preOpAssessmentNote: 'Acute appendicitis with localized tenderness. Emergency consent obtained.',
      consentFormSigned: true,
      pacCleared: true,
      npoStatusHours: 6,
      estimatedCost: 1400.0,
    },
  ]);

  // Handle Workflow Status Transitions
  const handleAdvanceStatus = (bookingId: string) => {
    setSurgeries((prev) =>
      prev.map((item) => {
        if (item.id !== bookingId) return item;
        let nextStatus = item.status;
        if (item.status === SurgeryStatus.PLANNED) nextStatus = SurgeryStatus.CONSENT_COMPLETED;
        else if (item.status === SurgeryStatus.CONSENT_COMPLETED) nextStatus = SurgeryStatus.PRE_OP_ASSESSED;
        else if (item.status === SurgeryStatus.PRE_OP_ASSESSED) nextStatus = SurgeryStatus.BOOKED;
        else if (item.status === SurgeryStatus.BOOKED) nextStatus = SurgeryStatus.IN_PROGRESS;
        else if (item.status === SurgeryStatus.IN_PROGRESS) nextStatus = SurgeryStatus.PROCEDURE_PERFORMED;
        else if (item.status === SurgeryStatus.PROCEDURE_PERFORMED) nextStatus = SurgeryStatus.POST_OP_RECOVERY;
        else if (item.status === SurgeryStatus.POST_OP_RECOVERY) nextStatus = SurgeryStatus.TRANSFERRED_TO_IPD;
        else if (item.status === SurgeryStatus.TRANSFERRED_TO_IPD) nextStatus = SurgeryStatus.COMPLETED;
        return { ...item, status: nextStatus };
      }),
    );
  };

  const getStatusBadge = (status: SurgeryStatus) => {
    switch (status) {
      case SurgeryStatus.IN_PROGRESS:
        return <span className="badge badge-danger" style={{ animation: 'pulse 2s infinite' }}>● Intra-Op In Progress</span>;
      case SurgeryStatus.POST_OP_RECOVERY:
        return <span className="badge badge-warning">PACU Recovery</span>;
      case SurgeryStatus.TRANSFERRED_TO_IPD:
        return <span className="badge badge-info">Transferred to IPD</span>;
      case SurgeryStatus.COMPLETED:
        return <span className="badge badge-success">Completed & Billed</span>;
      case SurgeryStatus.PRE_OP_ASSESSED:
        return <span className="badge badge-secondary" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>Pre-Op Cleared</span>;
      default:
        return <span className="badge badge-secondary">{status.replace(/_/g, ' ')}</span>;
    }
  };

  const filteredSurgeries = surgeries.filter((s) => {
    const matchesSearch =
      s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.surgeryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.surgeonName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoom = selectedRoom === 'ALL' || s.otRoom.includes(selectedRoom);
    return matchesSearch && matchesRoom;
  });

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
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="page-title">Operation Theatre (OT) Department</h2>
              <p className="page-subtitle">
                Surgical theater scheduling, WHO checklist, intra-operative execution & IPD handoff
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('equipment')}>
            <Activity size={16} /> OT Equipment Status
          </button>
          <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
            <Plus size={18} /> Schedule New Surgery
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Scissors size={24} />
            </div>
            <div>
              <div className="stat-value">{surgeries.length}</div>
              <div className="stat-label">Total Scheduled Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">
                {surgeries.filter((s) => s.status === SurgeryStatus.IN_PROGRESS).length}
              </div>
              <div className="stat-label">Currently Inside OT</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>
              <Activity size={24} />
            </div>
            <div>
              <div className="stat-value">
                {surgeries.filter((s) => s.status === SurgeryStatus.POST_OP_RECOVERY).length}
              </div>
              <div className="stat-label">In PACU Recovery</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <BedDouble size={24} />
            </div>
            <div>
              <div className="stat-value">
                {surgeries.filter((s) => s.status === SurgeryStatus.TRANSFERRED_TO_IPD).length}
              </div>
              <div className="stat-label">Transferred to Ward</div>
            </div>
          </div>
        </div>

        {/* OT Navigation Tab Bar */}
        <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Calendar size={18} /> Today's OT Board & Scheduling
          </button>
          <button
            className={`tab-item ${activeTab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            <ShieldCheck size={18} /> WHO Surgical Safety Checklist
          </button>
          <button
            className={`tab-item ${activeTab === 'postop' ? 'active' : ''}`}
            onClick={() => setActiveTab('postop')}
          >
            <FileText size={18} /> Post-Operative Notes & IPD Handoff
          </button>
        </div>

        {/* Search & OT Theater Filter */}
        <div className="filter-bar">
          <div className="search-input-box">
            <Search size={18} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search surgery, patient name, UHID, surgeon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter OT:</span>
            {['ALL', 'OT-1', 'OT-2', 'OT-3'].map((room) => (
              <button
                key={room}
                className={`subtab-pill ${selectedRoom === room ? 'active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                {room === 'ALL' ? 'All Theaters' : room}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: OT Surgery Board */}
        {activeTab === 'schedule' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Live Operation Theatre Master Schedule
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Multi-specialty surgical roster with real-time stage progression
                </p>
              </div>
              <span className="badge badge-info">{filteredSurgeries.length} Theaters Engaged</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time & Room</th>
                    <th>Patient Details</th>
                    <th>Procedure & Type</th>
                    <th>Surgical & Anesthesia Team</th>
                    <th>Readiness & PAC</th>
                    <th>Workflow Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurgeries.map((surg) => (
                    <tr key={surg.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{surg.scheduledTime}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{surg.otRoom}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Est: {surg.durationMinutes} mins</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{surg.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {surg.uhid} • {surg.age}Y • {surg.gender}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{surg.surgeryName}</div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {surg.surgeryType}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{surg.surgeonName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Anesth: {surg.anesthetistName}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                          Scrub: {surg.nursingTeam[0]?.split(' ')[1] || 'Assigned'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: surg.pacCleared ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {surg.pacCleared ? '✓ PAC Cleared' : '✗ PAC Pending'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: surg.consentFormSigned ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                            {surg.consentFormSigned ? '✓ Consent Signed' : '⚠ Consent Due'}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            NPO: {surg.npoStatusHours} hrs fasting
                          </span>
                        </div>
                      </td>

                      <td>{getStatusBadge(surg.status)}</td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedBooking(surg);
                              setShowChecklistModal(true);
                            }}
                            title="View Checklist & Notes"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAdvanceStatus(surg.id)}
                          >
                            Advance <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: WHO Surgical Safety Checklist */}
        {activeTab === 'checklist' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  World Health Organization (WHO) Surgical Safety Checklist
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Mandatory 3-phase patient safety protocol enforced before incision and recovery
                </p>
              </div>
              <span className="badge badge-success">Hospital Accreditation Compliant</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {/* Phase 1: SIGN IN */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1d4f91', fontWeight: 700 }}>
                  <CheckCircle size={18} />
                  <span>1. SIGN IN (Before Anesthesia)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Patient has confirmed identity, site, procedure & consent
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Surgical site marked / Not applicable
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Anesthesia safety check completed
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Pulse oximeter functioning on patient
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Known allergy checked & verified
                  </label>
                </div>
              </div>

              {/* Phase 2: TIME OUT */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', backgroundColor: '#fffbeb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#b45309', fontWeight: 700 }}>
                  <Clock size={18} />
                  <span>2. TIME OUT (Before Incision)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> All team members introduced by name & role
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Surgeon, Anesthetist & Nurse confirm patient & site
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Anticipated critical events & blood loss discussed
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Antibiotic prophylaxis given within past 60 mins
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Essential radiology imaging displayed
                  </label>
                </div>
              </div>

              {/* Phase 3: SIGN OUT */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#15803d', fontWeight: 700 }}>
                  <ShieldCheck size={18} />
                  <span>3. SIGN OUT (Before Leaving OT)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Nurse verbally confirms procedure recorded
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Instrument, sponge, and needle counts are correct
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Specimen labeled (including patient name)
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Equipment problems to be addressed identified
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" defaultChecked /> Key post-op recovery concerns reviewed with PACU
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Post-Operative Notes & IPD Handoff */}
        {activeTab === 'postop' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Operative Summary & IPD Ward Transfer Center
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Formal clinical handover from Surgeon/Anesthesia to Inpatient Ward Nurse & Post-Op Billing
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {surgeries.map((surg) => (
                <div
                  key={surg.id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--secondary)' }}>
                        {surg.surgeryName} — {surg.patientName} ({surg.uhid})
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Lead Surgeon: <strong>{surg.surgeonName}</strong> • OT Room: {surg.otRoom}
                      </div>
                    </div>
                    {getStatusBadge(surg.status)}
                  </div>

                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <strong>Operative Findings:</strong> {surg.postOpNotes || 'Surgery underway. Operative notes pending.'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <span>Estimated Surgical Cost: <strong>${surg.estimatedCost.toFixed(2)}</strong></span>
                      <span>PACU Recovery: Stable</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => alert(`Transfer initiated: ${surg.patientName} assigned to Inpatient Post-Op Bed.`)}
                      >
                        <BedDouble size={14} /> Assign IPD Bed
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => alert(`OT Bill Generated: $${surg.estimatedCost.toFixed(2)} queued in Cashier desk.`)}
                      >
                        <Receipt size={14} /> Send OT Bill to Cashier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Schedule New Surgery */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Schedule New Operation / Procedure</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Assign patient, surgical team, OT theater, and equipment
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowScheduleModal(false);
                alert('Surgery scheduled successfully. Roster updated.');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Patient UHID / Name *</label>
                  <input type="text" className="form-input" defaultValue="Eleanor Vance (UHID-202609-00002)" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Surgery / Procedure Name *</label>
                  <input type="text" className="form-input" defaultValue="Inguinal Hernia Mesh Repair" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Lead Surgeon *</label>
                  <input type="text" className="form-input" defaultValue="Dr. Michael Chang, MS" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Anesthetist *</label>
                  <input type="text" className="form-input" defaultValue="Dr. Kevin Vance, MD (Anesth)" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">OT Theater Room *</label>
                  <select className="form-select" defaultValue="OT-1 (Major Modular)">
                    <option value="OT-1 (Major Modular)">OT-1 (Major Modular)</option>
                    <option value="OT-2 (Laminar Flow Ortho)">OT-2 (Laminar Flow Ortho)</option>
                    <option value="OT-3 (Emergency / Trauma)">OT-3 (Emergency / Trauma)</option>
                    <option value="OT-4 (Day Care Minor)">OT-4 (Day Care Minor)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Scheduled Date *</label>
                  <input type="date" className="form-input" defaultValue="2026-09-16" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <input type="time" className="form-input" defaultValue="11:00" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Special Equipment Required</label>
                <input type="text" className="form-input" defaultValue="Mesh kit, Cautery pencil, Suction tube" />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem' }}>
                  <input type="checkbox" defaultChecked /> Pre-Anesthesia Check (PAC) Cleared
                </label>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem' }}>
                  <input type="checkbox" defaultChecked /> Surgical Informed Consent Signed
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><CheckCircle2 size={16} /> Confirm OT Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & Safety Checklist */}
      {showChecklistModal && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedBooking.surgeryName}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedBooking.surgeryCode} • {selectedBooking.patientName} ({selectedBooking.uhid})
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowChecklistModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Theater & Timing</div>
                <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                  {selectedBooking.otRoom} • {selectedBooking.scheduledDate} at {selectedBooking.scheduledTime}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.375rem' }}>
                  Assigned Team & Roles
                </div>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <li>Primary Surgeon: {selectedBooking.surgeonName}</li>
                  <li>Assistant: {selectedBooking.assistantSurgeon}</li>
                  <li>Anesthetist: {selectedBooking.anesthetistName}</li>
                  <li>Nursing: {selectedBooking.nursingTeam.join(', ')}</li>
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.375rem' }}>
                  Assigned Surgical Equipment
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedBooking.equipmentAssigned.map((eq, i) => (
                    <span key={i} className="badge badge-secondary">{eq}</span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.375rem' }}>
                  Pre-Operative Assessment Note
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                  {selectedBooking.preOpAssessmentNote}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowChecklistModal(false)}>Close</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleAdvanceStatus(selectedBooking.id);
                    setShowChecklistModal(false);
                  }}
                >
                  Advance Surgical Stage <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
