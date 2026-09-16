import React, { useState } from 'react';
import {
  Stethoscope,
  HeartPulse,
  FlaskConical,
  UserCheck,
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
} from 'lucide-react';

export const StaffSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'doctors' | 'nurses' | 'technicians' | 'receptionists' | 'administrators'
  >('doctors');

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<string>('Doctor');
  const [formData, setFormData] = useState<any>({});

  // Doctors State
  const [doctors, setDoctors] = useState([
    {
      id: '1',
      name: 'Dr. Sarah Jenkins',
      email: 'doctor@northhospital.com',
      phone: '+1 555-019-2834',
      dept: 'General Medicine',
      specialty: 'Internal Medicine',
      fee: '$75.00',
      license: 'MED-98421',
      schedule: 'Mon - Fri (09:00 - 17:00)',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Dr. Robert Vance',
      email: 'vance@northhospital.com',
      phone: '+1 555-019-5512',
      dept: 'Cardiology',
      specialty: 'Interventional Cardiology',
      fee: '$120.00',
      license: 'MED-77192',
      schedule: 'Mon, Wed, Fri (10:00 - 16:00)',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Dr. Marcus Brody',
      email: 'brody@northhospital.com',
      phone: '+1 555-019-8833',
      dept: 'Orthopedics',
      specialty: 'Joint & Spine Surgery',
      fee: '$100.00',
      license: 'MED-66231',
      schedule: 'Tue, Thu, Sat (09:00 - 15:00)',
      status: 'ACTIVE',
    },
  ]);

  // Nurses State
  const [nurses, setNurses] = useState([
    {
      id: '1',
      name: 'Elena Rostova, RN',
      email: 'nurse@northhospital.com',
      phone: '+1 555-014-9821',
      ward: 'Intensive Care Unit (ICU)',
      shift: 'Day Shift (07:00 - 15:00)',
      license: 'RN-88123',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Marcus Bell, BSN',
      email: 'mbell@northhospital.com',
      phone: '+1 555-014-4412',
      ward: 'Male General Ward (MGW)',
      shift: 'Evening Shift (15:00 - 23:00)',
      license: 'RN-99214',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Sarah Connor, RN',
      email: 'sconnor@northhospital.com',
      phone: '+1 555-014-3329',
      ward: 'Pediatric Specialty Ward',
      shift: 'Night Shift (23:00 - 07:00)',
      license: 'RN-66542',
      status: 'ACTIVE',
    },
  ]);

  // Technicians State
  const [technicians, setTechnicians] = useState([
    {
      id: '1',
      name: 'David Miller',
      email: 'lab@northhospital.com',
      phone: '+1 555-017-6654',
      dept: 'Clinical Pathology',
      specialty: 'Biochemistry & Hematology',
      shift: 'Morning (08:00 - 16:00)',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Priya Patel',
      email: 'ppatel@northhospital.com',
      phone: '+1 555-017-9921',
      dept: 'Radiology',
      specialty: 'CT & MRI Scanning',
      shift: 'Full Day (09:00 - 18:00)',
      status: 'ACTIVE',
    },
  ]);

  // Receptionists State
  const [receptionists, setReceptionists] = useState([
    {
      id: '1',
      name: 'Alice Wong',
      email: 'reception@northhospital.com',
      phone: '+1 555-013-1122',
      desk: 'Main Atrium Desk #1',
      shift: 'Morning Shift',
      languages: 'English, Spanish',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Carlos Mendez',
      email: 'carlos@northhospital.com',
      phone: '+1 555-013-4477',
      desk: 'Emergency Registration Desk',
      shift: 'Night Shift',
      languages: 'English, Portuguese',
      status: 'ACTIVE',
    },
  ]);

  // Administrators State
  const [administrators, setAdministrators] = useState([
    {
      id: '1',
      name: 'Harsh Director',
      email: 'admin@northhospital.com',
      phone: '+1 555-019-0001',
      role: 'Hospital Managing Director',
      dept: 'Executive Board',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Karen Reynolds',
      email: 'kreynolds@northhospital.com',
      phone: '+1 555-019-4402',
      role: 'Head of Clinical Operations',
      dept: 'Operations & Quality',
      status: 'ACTIVE',
    },
  ]);

  const handleOpenAddModal = (roleType: string) => {
    setModalRole(roleType);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    if (modalRole === 'Doctor') {
      setDoctors([...doctors, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalRole === 'Nurse') {
      setNurses([...nurses, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalRole === 'Technician') {
      setTechnicians([...technicians, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalRole === 'Receptionist') {
      setReceptionists([...receptionists, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalRole === 'Administrator') {
      setAdministrators([...administrators, { ...formData, id, status: 'ACTIVE' }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (roleType: string, id: string) => {
    if (roleType === 'Doctor') setDoctors(doctors.filter(d => d.id !== id));
    if (roleType === 'Nurse') setNurses(nurses.filter(n => n.id !== id));
    if (roleType === 'Technician') setTechnicians(technicians.filter(t => t.id !== id));
    if (roleType === 'Receptionist') setReceptionists(receptionists.filter(r => r.id !== id));
    if (roleType === 'Administrator') setAdministrators(administrators.filter(a => a.id !== id));
  };

  return (
    <div>
      {/* Subtabs Pill Bar */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('doctors')}
        >
          <Stethoscope size={16} /> Doctors ({doctors.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'nurses' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('nurses')}
        >
          <HeartPulse size={16} /> Nurses ({nurses.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'technicians' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('technicians')}
        >
          <FlaskConical size={16} /> Technicians ({technicians.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'receptionists' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('receptionists')}
        >
          <UserCheck size={16} /> Receptionists ({receptionists.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'administrators' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('administrators')}
        >
          <ShieldAlert size={16} /> Administrators ({administrators.length})
        </button>
      </div>

      {/* 1. Doctors */}
      {activeSubTab === 'doctors' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search doctors by name, license or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Doctor')}>
              <Plus size={16} /> + Onboard Doctor
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Department & Specialty</th>
                  <th>Consultation Fee</th>
                  <th>License Number</th>
                  <th>OPD Timetable</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors
                  .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.name}</strong>
                      </td>
                      <td>
                        <div>{doc.dept}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.specialty}</div>
                      </td>
                      <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{doc.fee}</span></td>
                      <td><code>{doc.license}</code></td>
                      <td><span style={{ fontSize: '0.8125rem' }}>{doc.schedule}</span></td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}><Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />{doc.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{doc.phone}</div>
                      </td>
                      <td><span className="badge badge-success">{doc.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('Doctor', doc.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Nurses */}
      {activeSubTab === 'nurses' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search nurses by name or assigned ward..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Nurse')}>
              <Plus size={16} /> + Onboard Nurse
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nurse Name</th>
                  <th>Assigned Ward / Station</th>
                  <th>Duty Shift</th>
                  <th>Nursing License</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nurses
                  .filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.ward.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((nurse) => (
                    <tr key={nurse.id}>
                      <td><strong>{nurse.name}</strong></td>
                      <td><span className="badge badge-info">{nurse.ward}</span></td>
                      <td>{nurse.shift}</td>
                      <td><code>{nurse.license}</code></td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>{nurse.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{nurse.phone}</div>
                      </td>
                      <td><span className="badge badge-success">{nurse.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('Nurse', nurse.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Technicians */}
      {activeSubTab === 'technicians' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search technicians..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Technician')}>
              <Plus size={16} /> + Onboard Technician
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Department</th>
                  <th>Diagnostic Specialty</th>
                  <th>Working Shift</th>
                  <th>Email & Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {technicians
                  .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tech) => (
                    <tr key={tech.id}>
                      <td><strong>{tech.name}</strong></td>
                      <td>{tech.dept}</td>
                      <td><span className="badge badge-secondary">{tech.specialty}</span></td>
                      <td>{tech.shift}</td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>{tech.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.phone}</div>
                      </td>
                      <td><span className="badge badge-success">{tech.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('Technician', tech.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Receptionists */}
      {activeSubTab === 'receptionists' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search receptionists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Receptionist')}>
              <Plus size={16} /> + Add Receptionist
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Desk / Counter Location</th>
                  <th>Assigned Shift</th>
                  <th>Languages Spoken</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receptionists
                  .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((rec) => (
                    <tr key={rec.id}>
                      <td><strong>{rec.name}</strong></td>
                      <td>{rec.desk}</td>
                      <td>{rec.shift}</td>
                      <td><span className="badge badge-info">{rec.languages}</span></td>
                      <td>{rec.email}</td>
                      <td><span className="badge badge-success">{rec.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('Receptionist', rec.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Administrators */}
      {activeSubTab === 'administrators' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search administrators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Administrator')}>
              <Plus size={16} /> + Add Administrator
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Admin Name</th>
                  <th>Hospital Administrative Role</th>
                  <th>Department Oversight</th>
                  <th>Direct Email</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {administrators
                  .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.name}</strong></td>
                      <td><span className="badge badge-warning">{admin.role}</span></td>
                      <td>{admin.dept}</td>
                      <td>{admin.email}</td>
                      <td>{admin.phone}</td>
                      <td><span className="badge badge-success">{admin.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('Administrator', admin.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Provision New {modalRole} Account</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveModal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dr. Arthur Conan"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Email (Login ID)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="staff@northhospital.com"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-input"
                  placeholder="+1 555-019-0000"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              {modalRole === 'Doctor' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Cardiology"
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clinical Specialty</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Pediatric Cardiology"
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee</label>
                    <input
                      className="form-input"
                      placeholder="$85.00"
                      onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Medical Council License No.</label>
                    <input
                      className="form-input"
                      placeholder="MED-12345"
                      onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">OPD Slot Timings</label>
                    <input
                      className="form-input"
                      placeholder="Mon - Fri (09:00 - 16:00)"
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    />
                  </div>
                </>
              )}

              {modalRole === 'Nurse' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Assigned Ward</label>
                    <input
                      className="form-input"
                      placeholder="e.g. ICU Wing"
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nursing Shift</label>
                    <select className="form-select" onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
                      <option value="Day Shift (07:00 - 15:00)">Day Shift (07:00 - 15:00)</option>
                      <option value="Evening Shift (15:00 - 23:00)">Evening Shift (15:00 - 23:00)</option>
                      <option value="Night Shift (23:00 - 07:00)">Night Shift (23:00 - 07:00)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Nursing License No.</label>
                    <input
                      className="form-input"
                      placeholder="RN-55443"
                      onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {modalRole === 'Technician' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Radiology / Lab"
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <input
                      className="form-input"
                      placeholder="e.g. MRI Specialist"
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {modalRole === 'Receptionist' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Desk / Counter Assignment</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Counter #3"
                      onChange={(e) => setFormData({ ...formData, desk: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Languages Spoken</label>
                    <input
                      className="form-input"
                      placeholder="e.g. English, French"
                      onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    />
                  </div>
                </>
              )}

              {modalRole === 'Administrator' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Admin Role Title</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Billing Supervisor"
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department Oversight</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Finance & Invoicing"
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Provision Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
