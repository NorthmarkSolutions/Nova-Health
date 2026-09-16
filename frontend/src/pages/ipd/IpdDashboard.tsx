import React, { useState } from 'react';
import {
  BedDouble,
  Users,
  Search,
  Plus,
  Activity,
  Pill,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRightLeft,
  LogOut,
  Stethoscope,
  HeartPulse,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { InpatientAdmission, InpatientStatus, MedicationAdminRecord } from '../../types';

export const IpdDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roster' | 'beds' | 'mar' | 'rounds' | 'discharge'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [activePatient, setActivePatient] = useState<InpatientAdmission | null>(null);

  // Inpatient admissions list
  const [admissions, setAdmissions] = useState<InpatientAdmission[]>([
    {
      id: 'ipd-001',
      admissionNo: 'IPD-202609-001',
      patientId: 'p-001',
      patientName: 'Robert Fox',
      uhid: 'UHID-202609-00001',
      age: 38,
      gender: 'MALE',
      wardName: 'Male Surgical Ward',
      roomNo: 'MSW-201',
      bedNo: 'B-04',
      admittingDoctor: 'Dr. Michael Chang, MS (Gen Surg)',
      admissionDate: '2026-09-14 18:30',
      plannedDischargeDate: '2026-09-17',
      diagnosis: 'Acute Cholecystitis, post-op Day 1 Lap Chole',
      advanceDeposit: 500.0,
      status: InpatientStatus.POST_OP,
      dietPlan: 'Sips of warm water, soft oral diet as tolerated',
      isolationRequired: false,
    },
    {
      id: 'ipd-002',
      admissionNo: 'IPD-202609-002',
      patientId: 'p-002',
      patientName: 'Eleanor Vance',
      uhid: 'UHID-202609-00002',
      age: 62,
      gender: 'FEMALE',
      wardName: 'Intensive Care Unit (ICU)',
      roomNo: 'ICU-101',
      bedNo: 'ICU-02',
      admittingDoctor: 'Dr. Jonathan Reed, MCh (Ortho)',
      admissionDate: '2026-09-15 08:00',
      plannedDischargeDate: '2026-09-19',
      diagnosis: 'Severe Osteoarthritis, scheduled TKR Right knee',
      advanceDeposit: 1000.0,
      status: InpatientStatus.ADMITTED,
      dietPlan: 'NPO for surgery',
      isolationRequired: false,
    },
    {
      id: 'ipd-003',
      admissionNo: 'IPD-202609-003',
      patientId: 'p-003',
      patientName: 'Marcus Brody',
      uhid: 'UHID-202609-00003',
      age: 54,
      gender: 'MALE',
      wardName: 'Medical Ward A',
      roomNo: 'MWA-304',
      bedNo: 'B-01',
      admittingDoctor: 'Dr. Sarah Jenkins, MD',
      admissionDate: '2026-09-12 11:20',
      plannedDischargeDate: '2026-09-15',
      diagnosis: 'Type 2 Diabetes Mellitus with Diabetic Foot Ulcer',
      advanceDeposit: 300.0,
      status: InpatientStatus.DISCHARGE_INITIATED,
      dietPlan: 'Diabetic 1800 kcal diet, low carb',
      isolationRequired: false,
    },
  ]);

  // Medication Administration Records (MAR)
  const [marList, setMarList] = useState<MedicationAdminRecord[]>([
    {
      id: 'mar-1',
      admissionId: 'ipd-001',
      medicineName: 'Inj. Ceftriaxone 1g',
      dosage: '1g IV in 100ml NS',
      route: 'IV Infusion',
      scheduledTime: '08:00 AM',
      administeredBy: 'Staff Nurse Maria',
      administeredAt: '08:15 AM',
      status: 'ADMINISTERED',
      nurseRemarks: 'Infused over 30 mins, no adverse reaction.',
    },
    {
      id: 'mar-2',
      admissionId: 'ipd-001',
      medicineName: 'Inj. Tramadol 50mg + Ondansetron 4mg',
      dosage: '50mg IV slow stat',
      route: 'IV Push',
      scheduledTime: '02:00 PM',
      status: 'PENDING',
      nurseRemarks: 'Post-op pain score 4/10.',
    },
    {
      id: 'mar-3',
      admissionId: 'ipd-001',
      medicineName: 'Tab. Pantoprazole 40mg',
      dosage: '1 Tab Before Food',
      route: 'Oral',
      scheduledTime: '08:00 PM',
      status: 'PENDING',
    },
  ]);

  // Beds Matrix
  const [beds, setBeds] = useState([
    { ward: 'Male Surgical Ward', bedNo: 'MSW-B01', type: 'Standard', status: 'AVAILABLE', patient: null },
    { ward: 'Male Surgical Ward', bedNo: 'MSW-B02', type: 'Standard', status: 'AVAILABLE', patient: null },
    { ward: 'Male Surgical Ward', bedNo: 'MSW-B03', type: 'Oxygen Support', status: 'CLEANING', patient: null },
    { ward: 'Male Surgical Ward', bedNo: 'MSW-B04', type: 'Standard', status: 'OCCUPIED', patient: 'Robert Fox (UHID-00001)' },
    { ward: 'Intensive Care Unit (ICU)', bedNo: 'ICU-B01', type: 'Ventilator Bed', status: 'OCCUPIED', patient: 'Arthur King' },
    { ward: 'Intensive Care Unit (ICU)', bedNo: 'ICU-B02', type: 'Ventilator Bed', status: 'OCCUPIED', patient: 'Eleanor Vance (UHID-00002)' },
    { ward: 'Intensive Care Unit (ICU)', bedNo: 'ICU-B03', type: 'Isolation ICU', status: 'AVAILABLE', patient: null },
    { ward: 'Medical Ward A', bedNo: 'MWA-B01', type: 'Standard', status: 'OCCUPIED', patient: 'Marcus Brody (UHID-00003)' },
    { ward: 'Medical Ward A', bedNo: 'MWA-B02', type: 'Standard', status: 'RESERVED', patient: 'Admit from Emergency' },
    { ward: 'Medical Ward A', bedNo: 'MWA-B03', type: 'Semi-Private', status: 'AVAILABLE', patient: null },
    { ward: 'Deluxe Private Suite', bedNo: 'DLX-401', type: 'Suite', status: 'AVAILABLE', patient: null },
    { ward: 'Deluxe Private Suite', bedNo: 'DLX-402', type: 'Suite', status: 'MAINTENANCE', patient: null },
  ]);

  const toggleMarStatus = (marId: string) => {
    setMarList((prev) =>
      prev.map((m) =>
        m.id === marId
          ? {
              ...m,
              status: m.status === 'PENDING' ? 'ADMINISTERED' : 'PENDING',
              administeredBy: m.status === 'PENDING' ? 'Staff Nurse Rachel' : undefined,
              administeredAt: m.status === 'PENDING' ? new Date().toLocaleTimeString() : undefined,
            }
          : m,
      ),
    );
  };

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch =
      adm.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.bedNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.admittingDoctor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWard = selectedWard === 'ALL' || adm.wardName.includes(selectedWard);
    return matchesSearch && matchesWard;
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
              <BedDouble size={20} />
            </div>
            <div>
              <h2 className="page-title">Inpatient Department (IPD) Station</h2>
              <p className="page-subtitle">
                Ward management, bed allocation, nursing MAR chart & clinical discharge workflows
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('beds')}>
            <Sparkles size={16} /> Live Bed Matrix
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdmitModal(true)}>
            <Plus size={18} /> Admit Inpatient
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="stat-value">{admissions.length}</div>
              <div className="stat-label">Currently Admitted</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <BedDouble size={24} />
            </div>
            <div>
              <div className="stat-value">{beds.filter((b) => b.status === 'AVAILABLE').length}</div>
              <div className="stat-label">Available Vacant Beds</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div className="stat-value">{beds.filter((b) => b.status === 'OCCUPIED').length}</div>
              <div className="stat-label">Occupied Beds (41.6%)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>
              <LogOut size={24} />
            </div>
            <div>
              <div className="stat-value">
                {admissions.filter((a) => a.status === InpatientStatus.DISCHARGE_INITIATED).length}
              </div>
              <div className="stat-label">Discharges Planned Today</div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-item ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Users size={18} /> Admitted Inpatient Roster
          </button>
          <button
            className={`tab-item ${activeTab === 'beds' ? 'active' : ''}`}
            onClick={() => setActiveTab('beds')}
          >
            <BedDouble size={18} /> Ward & Bed Visual Matrix
          </button>
          <button
            className={`tab-item ${activeTab === 'mar' ? 'active' : ''}`}
            onClick={() => setActiveTab('mar')}
          >
            <Pill size={18} /> Medication Administration Record (MAR)
          </button>
          <button
            className={`tab-item ${activeTab === 'rounds' ? 'active' : ''}`}
            onClick={() => setActiveTab('rounds')}
          >
            <Stethoscope size={18} /> Doctor Inpatient Rounds
          </button>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-box">
            <Search size={18} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search patient, UHID, room, bed, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ward:</span>
            {['ALL', 'Surgical', 'ICU', 'Medical'].map((w) => (
              <button
                key={w}
                className={`subtab-pill ${selectedWard === w ? 'active' : ''}`}
                onClick={() => setSelectedWard(w)}
              >
                {w === 'ALL' ? 'All Wards' : w}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Admitted Inpatient Roster */}
        {activeTab === 'roster' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Active Inpatient Census ({filteredAdmissions.length})
              </h3>
              <span className="badge badge-info">Real-time Ward Sync</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Admission No</th>
                    <th>Patient Name</th>
                    <th>Ward / Room / Bed</th>
                    <th>Admitting Consultant</th>
                    <th>Diagnosis & Diet</th>
                    <th>Admission Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmissions.map((adm) => (
                    <tr key={adm.id}>
                      <td><code>{adm.admissionNo}</code></td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{adm.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {adm.uhid} • {adm.age}Y • {adm.gender}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{adm.wardName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                          Room: {adm.roomNo} | Bed: {adm.bedNo}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{adm.admittingDoctor}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>{adm.diagnosis}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Diet: {adm.dietPlan}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>{adm.admissionDate}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Deposit: ${adm.advanceDeposit.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            adm.status === InpatientStatus.DISCHARGE_INITIATED
                              ? 'badge-warning'
                              : adm.status === InpatientStatus.POST_OP
                              ? 'badge-info'
                              : 'badge-success'
                          }`}
                        >
                          {adm.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActivePatient(adm);
                              setActiveTab('mar');
                            }}
                            title="Open Medication Chart"
                          >
                            <Pill size={14} /> MAR
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setActivePatient(adm);
                              setShowDischargeModal(true);
                            }}
                          >
                            Discharge
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

        {/* TAB 2: Visual Bed Matrix */}
        {activeTab === 'beds' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Hospital Bed Allocation & Occupancy Grid
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Real-time bed availability across ICU, Surgical, Medical, and Deluxe Suites
                </p>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span> Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span> Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span> Cleaning
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span> Maintenance
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {beds.map((b, idx) => {
                let statusColor = 'var(--success)';
                let bgTint = 'rgba(16, 185, 129, 0.08)';
                let borderTint = '#bbf7d0';

                if (b.status === 'OCCUPIED') {
                  statusColor = 'var(--primary)';
                  bgTint = 'rgba(2, 132, 199, 0.08)';
                  borderTint = '#bae6fd';
                } else if (b.status === 'CLEANING') {
                  statusColor = '#d97706';
                  bgTint = 'rgba(245, 158, 11, 0.08)';
                  borderTint = '#fde68a';
                } else if (b.status === 'MAINTENANCE') {
                  statusColor = 'var(--danger)';
                  bgTint = 'rgba(239, 68, 68, 0.08)';
                  borderTint = '#fecaca';
                }

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: bgTint,
                      border: `1.5px solid ${borderTint}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--secondary)' }}>{b.bedNo}</div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: '#ffffff',
                          color: statusColor,
                          border: `1px solid ${statusColor}`,
                        }}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.ward}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>Category: {b.type}</div>

                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.75rem' }}>
                      {b.patient ? (
                        <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>👤 {b.patient}</div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Ready for Admission</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Medication Administration Record (MAR) */}
        {activeTab === 'mar' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Nurse Medication Administration Record (MAR) — Robert Fox (B-04)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Scheduled doses, administration timestamps, nurse digital sign-offs
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setMarList([
                    ...marList,
                    {
                      id: `mar-${Date.now()}`,
                      admissionId: 'ipd-001',
                      medicineName: 'Inj. Paracetamol 1g IV',
                      dosage: '1g IV Infusion',
                      route: 'IV',
                      scheduledTime: '06:00 PM',
                      status: 'PENDING',
                    },
                  ])
                }
              >
                <Plus size={14} /> Add Stat Dose
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Scheduled Time</th>
                    <th>Medication Name & Dosage</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Administered By</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {marList.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.scheduledTime}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{m.medicineName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.dosage}</div>
                      </td>
                      <td><span className="badge badge-secondary">{m.route}</span></td>
                      <td>
                        <span className={`badge ${m.status === 'ADMINISTERED' ? 'badge-success' : 'badge-warning'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>{m.administeredBy || '—'}</td>
                      <td>{m.administeredAt || '—'}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${m.status === 'ADMINISTERED' ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => toggleMarStatus(m.id)}
                        >
                          {m.status === 'ADMINISTERED' ? 'Undo' : 'Confirm Dose Given'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Doctor Inpatient Rounds */}
        {activeTab === 'rounds' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Daily Inpatient Consultant Rounds
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Record clinical progress, review lab values, and adjust inpatient care orders
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                    Round Note: Dr. Michael Chang — Robert Fox (Bed MSW-B04)
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today at 09:15 AM</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  Post-op Day 1 Lap Cholecystectomy. Patient afebrile, surgical port sites clean and dry. Bowel sounds present. Tolerating oral fluids well. Advised to mobilize and transition to oral analgesics. Plan for discharge tomorrow morning if stable.
                </p>
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                    Round Note: Dr. Sarah Jenkins — Marcus Brody (Bed MWA-B01)
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today at 08:30 AM</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  Diabetic foot ulcer granulation tissue healthy. Fasting blood sugar controlled at 118 mg/dL on basal insulin. Discharge summary approved. Cleared for billing and home dressing protocol.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Admit New Patient */}
      {showAdmitModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Inpatient Admission Request</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Assign ward, bed, and initial clinical assessment</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdmitModal(false)}>✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowAdmitModal(false);
                alert('Patient admitted to ward. Bed locked in hospital matrix.');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Patient UHID / Name *</label>
                  <input type="text" className="form-input" defaultValue="Arthur King (UHID-202609-00005)" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Admitting Consultant *</label>
                  <input type="text" className="form-input" defaultValue="Dr. Sarah Jenkins, MD" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ward Selection *</label>
                  <select className="form-select" defaultValue="Medical Ward A">
                    <option value="Male Surgical Ward">Male Surgical Ward</option>
                    <option value="Medical Ward A">Medical Ward A</option>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Deluxe Private Suite">Deluxe Private Suite</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bed Allocation *</label>
                  <select className="form-select" defaultValue="MWA-B03">
                    <option value="MSW-B01">MSW-B01 (Available)</option>
                    <option value="MSW-B02">MSW-B02 (Available)</option>
                    <option value="MWA-B03">MWA-B03 (Semi-Private Available)</option>
                    <option value="ICU-B03">ICU-B03 (Isolation Available)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Admission Diagnosis *</label>
                <input type="text" className="form-input" defaultValue="Community Acquired Pneumonia with Hypoxia" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Advance Deposit Paid ($) *</label>
                  <input type="number" className="form-input" defaultValue="500" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dietary Instructions</label>
                  <input type="text" className="form-input" defaultValue="Soft salt-restricted diet" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdmitModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><CheckCircle2 size={16} /> Complete Admission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Discharge Summary Generator */}
      {showDischargeModal && activePatient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Clinical Discharge Summary</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {activePatient.admissionNo} • {activePatient.patientName} ({activePatient.uhid})
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDischargeModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                <div><strong>Admitted:</strong> {activePatient.admissionDate}</div>
                <div><strong>Discharged:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Consultant:</strong> {activePatient.admittingDoctor}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Final Diagnosis at Discharge</label>
                <input type="text" className="form-input" defaultValue={activePatient.diagnosis} />
              </div>

              <div className="form-group">
                <label className="form-label">Hospital Course & Operative Summary</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  defaultValue="Patient admitted and evaluated. Treatment completed successfully. Post-procedure period uneventful. Vitals stable on room air. Ambulated comfortably without support."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Discharge Medications & Regimen</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  defaultValue="1. Tab Cefuroxime 500mg (1-0-1) for 5 days. 2. Tab Paracetamol 650mg SOS. 3. Tab Pantoprazole 40mg (1-0-0) before food."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Condition at Discharge</label>
                  <select className="form-select" defaultValue="Stable & Ambulatory">
                    <option value="Stable & Ambulatory">Stable & Ambulatory</option>
                    <option value="Requires Assistance">Requires Assistance</option>
                    <option value="Transferred to Higher Center">Transferred to Higher Center</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up OPD Consultation</label>
                  <input type="date" className="form-input" defaultValue="2026-09-22" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowDischargeModal(false)}>Close</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDischargeModal(false);
                    alert(`Discharge summary generated. Bed ${activePatient.bedNo} flagged for cleaning. Final bill sent to Cashier.`);
                  }}
                >
                  <Printer size={16} /> Sign & Issue Discharge Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
