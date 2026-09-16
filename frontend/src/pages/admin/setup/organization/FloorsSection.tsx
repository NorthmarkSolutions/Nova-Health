import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  CheckCircle2,
  Activity,
  UserCheck,
  Stethoscope,
  DoorClosed,
} from 'lucide-react';

export const FloorsSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const [floors, setFloors] = useState([
    {
      id: '1',
      number: 'Ground Floor (Level 0)',
      building: 'Main Hospital Tower',
      keyDepartments: ['Central Reception & Triage', 'OPD General & Specialty', 'Patient Billing & Cashier', 'Central Pharmacy Counter', 'Emergency Trauma Unit'],
      totalRooms: 28,
      totalWards: 2,
      accessZone: 'Public Open Access',
      status: 'OPERATIONAL',
    },
    {
      id: '2',
      number: 'First Floor (Level 1)',
      building: 'Main Hospital Tower',
      keyDepartments: ['General Inpatient Wards (Male/Female)', 'Intensive Care Unit (ICU Wing)', 'Central Nursing Station #1', 'Daycare Chemotherapy'],
      totalRooms: 34,
      totalWards: 4,
      accessZone: 'Authorized Visitors & Patients',
      status: 'OPERATIONAL',
    },
    {
      id: '3',
      number: 'Second Floor (Level 2)',
      building: 'Main Hospital Tower',
      keyDepartments: ['Major Operation Theatres (OT 1 - 4)', 'Post-Anesthesia Recovery Room (PACU)', 'Central Sterile Supply Dept (CSSD)', 'Surgical ICU (SICU)'],
      totalRooms: 22,
      totalWards: 2,
      accessZone: 'Sterile Surgical Zone (Strict Access)',
      status: 'OPERATIONAL',
    },
    {
      id: '4',
      number: 'Third Floor (Level 3)',
      building: 'Main Hospital Tower',
      keyDepartments: ['Executive Administration Boardroom', 'Human Resources (HR)', 'Finance, Billing Audit & Accounts', 'Hospital IT & Server Datacenter', 'Medical Records (MRD)'],
      totalRooms: 18,
      totalWards: 0,
      accessZone: 'Staff Only (RFID Access)',
      status: 'OPERATIONAL',
    },
    {
      id: '5',
      number: 'Basement Level 1 (B1)',
      building: 'Diagnostic Pavilion',
      keyDepartments: ['Clinical Biochemistry Lab', 'Radiology, 3T MRI & 128-Slice CT', 'Blood Transfusion Bank', 'Biomedical Waste Disposal & Morgue'],
      totalRooms: 20,
      totalWards: 0,
      accessZone: 'Diagnostic & Technical Zone',
      status: 'OPERATIONAL',
    },
  ]);

  const handleOpenAdd = () => {
    setFormData({ totalRooms: 10, totalWards: 1, accessZone: 'Authorized Staff', status: 'OPERATIONAL' });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const deptArray = typeof formData.keyDepartments === 'string'
      ? formData.keyDepartments.split(',').map((s: string) => s.trim())
      : ['General Unit'];
    setFloors([...floors, { ...formData, keyDepartments: deptArray, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setFloors(floors.filter(f => f.id !== id));
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search floors by number, building or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register Floor
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {floors
          .filter(f => f.number.toLowerCase().includes(searchQuery.toLowerCase()) || f.building.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((floor) => (
            <div key={floor.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info"><Layers size={12} /> {floor.building}</span>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {floor.number}
                    </h4>
                    <span className="badge badge-success">{floor.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Access Security Level: <strong>{floor.accessZone}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="action-btn delete" onClick={() => handleDelete(floor.id)} title="Delete Floor">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Floor Layout Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Rooms Mapped</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>{floor.totalRooms} Rooms</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Inpatient Wards</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--teal)' }}>{floor.totalWards} Wards</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Departments Located</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>{floor.keyDepartments.length} Units</div>
                </div>
              </div>

              {/* Department Pills on this Floor */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.375rem' }}>
                  Departments, Clinical Units & Stations on this Floor:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {floor.keyDepartments.map((deptName, idx) => (
                    <span key={idx} className="badge badge-secondary" style={{ padding: '0.35rem 0.65rem' }}>
                      <CheckCircle2 size={12} color="var(--primary)" /> {deptName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Add Floor Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Floor</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Floor Designation / Number</label>
                <input className="form-input" placeholder="e.g. Fourth Floor (Level 4)" onChange={(e) => setFormData({ ...formData, number: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Parent Building</label>
                <input className="form-input" placeholder="e.g. Main Hospital Tower" onChange={(e) => setFormData({ ...formData, building: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Rooms</label>
                <input type="number" className="form-input" placeholder="20" onChange={(e) => setFormData({ ...formData, totalRooms: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Wards</label>
                <input type="number" className="form-input" placeholder="2" onChange={(e) => setFormData({ ...formData, totalWards: Number(e.target.value) })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Access Security Classification</label>
                <input className="form-input" placeholder="e.g. Sterile Zone or Authorized Visitors" onChange={(e) => setFormData({ ...formData, accessZone: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Departments (comma-separated)</label>
                <input className="form-input" placeholder="e.g. Pediatric Ward, Neonatal Unit, Nursing Station #4" onChange={(e) => setFormData({ ...formData, keyDepartments: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
