import React, { useState } from 'react';
import {
  LayoutGrid,
  Stethoscope,
  FlaskConical,
  Coins,
  Shield,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Clock,
  UserCheck,
  Settings,
  Layers,
  FileText,
} from 'lucide-react';

export const DepartmentsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptConfig, setSelectedDeptConfig] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const [departments, setDepartments] = useState([
    // Clinical
    { id: '1', code: 'DEPT-OPD', name: 'Outpatient Department (OPD)', category: 'clinical', head: 'Dr. Sarah Jenkins', hours: '08:00 - 20:00 (Mon-Sat)', costCenter: 'CC-CLN-01', staffCount: 24, status: 'ACTIVE' },
    { id: '2', code: 'DEPT-IPD', name: 'Inpatient Department (IPD)', category: 'clinical', head: 'Dr. Robert Vance', hours: '24/7 Continuous', costCenter: 'CC-CLN-02', staffCount: 52, status: 'ACTIVE' },
    { id: '3', code: 'DEPT-ER', name: 'Emergency & Trauma (ER)', category: 'clinical', head: 'Dr. Neil Patrick', hours: '24/7 Emergency', costCenter: 'CC-CLN-03', staffCount: 30, status: 'ACTIVE' },
    { id: '4', code: 'DEPT-ICU', name: 'Intensive Critical Care (ICU)', category: 'clinical', head: 'Dr. Arthur Pendelton', hours: '24/7 Critical', costCenter: 'CC-CLN-04', staffCount: 28, status: 'ACTIVE' },
    { id: '5', code: 'DEPT-OT', name: 'Operation Theatre & Surgery (OT)', category: 'clinical', head: 'Dr. Marcus Brody', hours: '24/7 Surgeries', costCenter: 'CC-CLN-05', staffCount: 20, status: 'ACTIVE' },
    { id: '6', code: 'DEPT-NICU', name: 'Neonatal ICU (NICU)', category: 'clinical', head: 'Dr. Emily Thorne', hours: '24/7 Neonatal', costCenter: 'CC-CLN-06', staffCount: 16, status: 'ACTIVE' },
    { id: '7', code: 'DEPT-DIAL', name: 'Renal Dialysis Unit', category: 'clinical', head: 'Dr. Kevin Zhao', hours: '06:00 - 22:00', costCenter: 'CC-CLN-07', staffCount: 12, status: 'ACTIVE' },
    { id: '8', code: 'DEPT-PHYSIO', name: 'Physiotherapy & Rehab', category: 'clinical', head: 'Dr. Claire Bennett', hours: '09:00 - 18:00', costCenter: 'CC-CLN-08', staffCount: 8, status: 'ACTIVE' },

    // Diagnostic
    { id: '9', code: 'DEPT-LAB', name: 'Clinical Biochemistry & Lab', category: 'diagnostic', head: 'Dr. Amanda Chen', hours: '24/7 Lab Services', costCenter: 'CC-DIAG-01', staffCount: 14, status: 'ACTIVE' },
    { id: '10', code: 'DEPT-RAD', name: 'Radiology, CT & MRI', category: 'diagnostic', head: 'Dr. Jonathan Ross', hours: '24/7 Imaging', costCenter: 'CC-DIAG-02', staffCount: 18, status: 'ACTIVE' },
    { id: '11', code: 'DEPT-PATH', name: 'Histopathology & Cytology', category: 'diagnostic', head: 'Dr. Anita Roy', hours: '09:00 - 18:00', costCenter: 'CC-DIAG-03', staffCount: 8, status: 'ACTIVE' },
    { id: '12', code: 'DEPT-BLOOD', name: 'Blood Transfusion & Blood Bank', category: 'diagnostic', head: 'Dr. Michael Chang', hours: '24/7 Emergency Transfusion', costCenter: 'CC-DIAG-04', staffCount: 10, status: 'ACTIVE' },

    // Revenue
    { id: '13', code: 'DEPT-BILL', name: 'Patient Billing & Cashier Desk', category: 'revenue', head: 'Susan Alvarez', hours: '24/7 Inpatient / OPD Cashier', costCenter: 'CC-REV-01', staffCount: 12, status: 'ACTIVE' },
    { id: '14', code: 'DEPT-INSUR', name: 'Insurance & TPA Helpdesk', category: 'revenue', head: 'David Kumar', hours: '08:00 - 20:00 (Pre-Auth)', costCenter: 'CC-REV-02', staffCount: 6, status: 'ACTIVE' },
    { id: '15', code: 'DEPT-PHARM', name: 'Inpatient & Retail Pharmacy', category: 'revenue', head: 'David Ross, PharmD', hours: '24/7 Pharmacy Counter', costCenter: 'CC-REV-03', staffCount: 15, status: 'ACTIVE' },
    { id: '16', code: 'DEPT-CORP', name: 'Corporate Empanelment Desk', category: 'revenue', head: 'Rachel Green', hours: '09:00 - 18:00', costCenter: 'CC-REV-04', staffCount: 4, status: 'ACTIVE' },

    // Admin
    { id: '17', code: 'DEPT-HR', name: 'Human Resources & Payroll', category: 'admin', head: 'Patricia Wright', hours: '09:00 - 18:00', costCenter: 'CC-ADM-01', staffCount: 8, status: 'ACTIVE' },
    { id: '18', code: 'DEPT-FIN', name: 'Finance & Accounts Audit', category: 'admin', head: 'Franklin Moore, CPA', hours: '09:00 - 18:00', costCenter: 'CC-ADM-02', staffCount: 7, status: 'ACTIVE' },
    { id: '19', code: 'DEPT-MRD', name: 'Medical Records Department (MRD)', category: 'admin', head: 'Helen Keller, RHIA', hours: '08:00 - 18:00', costCenter: 'CC-ADM-03', staffCount: 9, status: 'ACTIVE' },
    { id: '20', code: 'DEPT-LEGAL', name: 'Legal & Clinical Compliance', category: 'admin', head: 'Adv. Samuel Vance', hours: '09:00 - 17:00', costCenter: 'CC-ADM-04', staffCount: 3, status: 'ACTIVE' },

    // Support
    { id: '21', code: 'DEPT-HK', name: 'Hospital Housekeeping & Sanitation', category: 'support', head: 'George Bailey', hours: '24/7 Multi-Shift', costCenter: 'CC-SUP-01', staffCount: 48, status: 'ACTIVE' },
    { id: '22', code: 'DEPT-BIOMED', name: 'Biomedical Engineering & Calibration', category: 'support', head: 'Eng. Victor Stone', hours: '24/7 On-Call Maintenance', costCenter: 'CC-SUP-02', staffCount: 6, status: 'ACTIVE' },
    { id: '23', code: 'DEPT-SEC', name: 'Security & Access Surveillance', category: 'support', head: 'Capt. Roger Davis', hours: '24/7 CCTV & Guards', costCenter: 'CC-SUP-03', staffCount: 22, status: 'ACTIVE' },
    { id: '24', code: 'DEPT-KITCH', name: 'Dietary & Patient Nutrition Kitchen', category: 'support', head: 'Chef Maria Santos', hours: '05:00 - 22:00 (Meal Schedules)', costCenter: 'CC-SUP-04', staffCount: 18, status: 'ACTIVE' },
  ]);

  const handleOpenAdd = () => {
    setFormData({ category: 'clinical', status: 'ACTIVE', staffCount: 1 });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setDepartments([...departments, { ...formData, id: Date.now().toString() }]);
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  return (
    <div>
      {/* Category Filter Pills */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`subtab-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <LayoutGrid size={15} /> All Departments ({departments.length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveCategory('clinical')}
        >
          <Stethoscope size={15} /> Clinical (8)
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'diagnostic' ? 'active' : ''}`}
          onClick={() => setActiveCategory('diagnostic')}
        >
          <FlaskConical size={15} /> Diagnostic (4)
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveCategory('revenue')}
        >
          <Coins size={15} /> Revenue & Billing (4)
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveCategory('admin')}
        >
          <Shield size={15} /> Administration & HR (4)
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'support' ? 'active' : ''}`}
          onClick={() => setActiveCategory('support')}
        >
          <Wrench size={15} /> Support & Facilities (4)
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search departments by code, name or head..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register Department
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Department Name</th>
              <th>Category</th>
              <th>Department Head</th>
              <th>Working Hours</th>
              <th>Cost Center</th>
              <th>Staff Active</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Configuration</th>
            </tr>
          </thead>
          <tbody>
            {departments
              .filter(d => (activeCategory === 'all' || d.category === activeCategory) && (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.head.toLowerCase().includes(searchQuery.toLowerCase()) || d.code.toLowerCase().includes(searchQuery.toLowerCase())))
              .map((dept) => (
                <tr key={dept.id}>
                  <td><strong>{dept.code}</strong></td>
                  <td><strong>{dept.name}</strong></td>
                  <td>
                    <span
                      className={`badge ${
                        dept.category === 'clinical'
                          ? 'badge-info'
                          : dept.category === 'diagnostic'
                          ? 'badge-warning'
                          : dept.category === 'revenue'
                          ? 'badge-success'
                          : 'badge-secondary'
                      }`}
                    >
                      {dept.category}
                    </span>
                  </td>
                  <td>{dept.head}</td>
                  <td><span style={{ fontSize: '0.8125rem' }}>{dept.hours}</span></td>
                  <td><code>{dept.costCenter}</code></td>
                  <td><span className="badge badge-secondary">{dept.staffCount} Staff</span></td>
                  <td><span className="badge badge-success">{dept.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        className="action-btn edit"
                        onClick={() => setSelectedDeptConfig(dept)}
                        title="Department Configuration & Escalation Matrix"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(dept.id)}
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Department Configuration Drawer / Modal */}
      {selectedDeptConfig && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Department Policy & Escalation: {selectedDeptConfig.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Cost Center: {selectedDeptConfig.costCenter} • Head: {selectedDeptConfig.head}</p>
              </div>
              <button className="action-btn" onClick={() => setSelectedDeptConfig(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--secondary)' }}>
                  1. Clinical Approval & Authorization Matrix
                </h4>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Level 1 Approval: Shift In-Charge Doctor | Level 2 Approval: Department Head ({selectedDeptConfig.head}) | Level 3 Escalation: Medical Superintendent
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--secondary)' }}>
                  2. Resource & Budget Allocation
                </h4>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Monthly Consumable Quota: $45,000 | Equipment Calibration Cycle: Monthly (First Monday)
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--secondary)' }}>
                  3. Emergency Department Protocol
                </h4>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Code Red / Code Blue Response Time: &lt; 90 seconds | Statutory Handover Logs: Mandatory at 07:00, 15:00, 23:00
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => setSelectedDeptConfig(null)}>
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Department</h3>
              <button className="action-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Department Code</label>
                <input className="form-input" placeholder="e.g. DEPT-PULM" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input className="form-input" placeholder="e.g. Pulmonology & Sleep Lab" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Classification Category</label>
                <select className="form-select" onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="clinical">Clinical</option>
                  <option value="diagnostic">Diagnostic</option>
                  <option value="revenue">Revenue</option>
                  <option value="admin">Administration</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Head of Department</label>
                <input className="form-input" placeholder="e.g. Dr. Jennifer Wu" onChange={(e) => setFormData({ ...formData, head: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Working Hours</label>
                <input className="form-input" placeholder="e.g. 08:00 - 18:00 or 24/7" onChange={(e) => setFormData({ ...formData, hours: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Center Code</label>
                <input className="form-input" placeholder="e.g. CC-CLN-09" onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
