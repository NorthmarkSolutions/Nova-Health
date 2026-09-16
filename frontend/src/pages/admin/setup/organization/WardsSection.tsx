import React, { useState } from 'react';
import {
  BedDouble,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  AlertOctagon,
  Users,
  Settings,
} from 'lucide-react';

export const WardsSection: React.FC = () => {
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWardPolicy, setSelectedWardPolicy] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const wardTypes = [
    'General Ward',
    'Male Ward',
    'Female Ward',
    'Pediatric Ward',
    'Maternity Ward',
    'ICU Ward',
    'NICU Ward',
    'Isolation Ward',
    'VIP Ward',
  ];

  const [wards, setWards] = useState([
    {
      id: '1',
      name: 'Central General Medical Ward',
      type: 'General Ward',
      capacity: 50,
      occupied: 38,
      supervisor: 'Elena Rostova, RN',
      nursingTeam: '8 Shift Nurses (Team Delta)',
      allocationRules: 'Standard non-critical adult admissions, UHID registration mandatory',
      infectionProtocol: 'Standard Airborne & Contact Precautions (Gloves, Apron, Hand-rub)',
      escalationMatrix: 'Ward Nurse -> Shift MO -> Dr. Sarah Jenkins (Head Gen Med)',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Male Surgical Inpatient Ward',
      type: 'Male Ward',
      capacity: 35,
      occupied: 28,
      supervisor: 'Marcus Bell, BSN',
      nursingTeam: '6 Shift Nurses',
      allocationRules: 'Post-op general & orthopedic male surgical recovery',
      infectionProtocol: 'Surgical Site Infection (SSI) Surveillance Protocol',
      escalationMatrix: 'Staff Nurse -> Resident Surgeon -> Dr. Marcus Brody',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Female Medical & Ortho Ward',
      type: 'Female Ward',
      capacity: 35,
      occupied: 30,
      supervisor: 'Clara Oswald, BSN',
      nursingTeam: '6 Shift Nurses',
      allocationRules: 'Adult female medical & orthopedics recovery admissions',
      infectionProtocol: 'Standard Hospital Sanitation & Linen Replacement Protocol',
      escalationMatrix: 'Ward Sister -> Duty MO -> Dr. Sarah Jenkins',
      status: 'ACTIVE',
    },
    {
      id: '4',
      name: 'Pediatric & Child Care Ward',
      type: 'Pediatric Ward',
      capacity: 25,
      occupied: 18,
      supervisor: 'Sarah Connor, RN',
      nursingTeam: '7 Pediatric Certified Nurses',
      allocationRules: 'Children & Adolescents up to age 16 with parent attendant',
      infectionProtocol: 'Pediatric Droplet & Hand Hygiene Protocol',
      escalationMatrix: 'Pediatric Nurse -> Pediatric Fellow -> Dr. Emily Thorne',
      status: 'ACTIVE',
    },
    {
      id: '5',
      name: 'Maternity, Labor & Post-Natal Suite',
      type: 'Maternity Ward',
      capacity: 20,
      occupied: 15,
      supervisor: 'Hannah Abbott, Midwife Specialist',
      nursingTeam: '8 Labor & Post-Natal Nurses',
      allocationRules: 'Ante-natal, active labor, normal & C-section mothers',
      infectionProtocol: 'Strict Aseptic Delivery & Neonatal Contact Barrier',
      escalationMatrix: 'Labor Nurse -> Ob-Gyn On-Call -> Lead Obstetrician',
      status: 'ACTIVE',
    },
    {
      id: '6',
      name: 'Intensive Critical Care Unit (ICU)',
      type: 'ICU Ward',
      capacity: 20,
      occupied: 18,
      supervisor: 'Rachel Amber, Critical Care Specialist',
      nursingTeam: '12 1:1 / 1:2 Critical Care Nurses',
      allocationRules: 'Hemodynamically unstable, intubated or multi-organ support',
      infectionProtocol: 'VAP Bundle, CAUTI Prevention & High-Level Disinfection',
      escalationMatrix: 'ICU Nurse -> Intensivist On-Duty -> Dr. Arthur Pendelton',
      status: 'ACTIVE',
    },
    {
      id: '7',
      name: 'Neonatal Intensive Care Unit (NICU)',
      type: 'NICU Ward',
      capacity: 15,
      occupied: 12,
      supervisor: 'Jessica Day, Neonatal RN',
      nursingTeam: '10 Incubator Trained Nurses',
      allocationRules: 'Preterm, low birth-weight, respiratory distress neonates',
      infectionProtocol: 'Sterile Incubator Sanitization, Filtered Air Barrier',
      escalationMatrix: 'NICU Sister -> Neonatologist -> Dr. Emily Thorne',
      status: 'ACTIVE',
    },
    {
      id: '8',
      name: 'Negative Pressure Bio-Isolation Ward',
      type: 'Isolation Ward',
      capacity: 10,
      occupied: 4,
      supervisor: 'Dr. Anita Roy / Sister Nora',
      nursingTeam: '5 PPE-Certified Infectious Team Nurses',
      allocationRules: 'Suspected/Confirmed TB, COVID, Mpox, Airborne pathogens',
      infectionProtocol: 'Negative Pressure (-2.5 Pa) & Full Level 3 PPE Suit',
      escalationMatrix: 'Isolation Nurse -> Hospital Epidemiologist -> Medical Sup.',
      status: 'ACTIVE',
    },
    {
      id: '9',
      name: 'Executive Presidential VIP Wing',
      type: 'VIP Ward',
      capacity: 8,
      occupied: 5,
      supervisor: 'Grace Kelly, Executive Hospitality Manager',
      nursingTeam: '4 Senior Concierge Nurses',
      allocationRules: 'Single private room admissions with private attendant suite',
      infectionProtocol: 'Private Disinfection Protocol & Dedicated Consumable Stock',
      escalationMatrix: 'VIP Concierge Nurse -> Attending Senior Consultant',
      status: 'ACTIVE',
    },
  ]);

  const handleOpenAdd = () => {
    setFormData({
      type: 'General Ward',
      capacity: 20,
      occupied: 0,
      status: 'ACTIVE',
      allocationRules: 'Standard adult admissions',
      infectionProtocol: 'Standard Hand Hygiene Protocol',
      escalationMatrix: 'Ward Sister -> Duty MO',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setWards([...wards, { ...formData, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setWards(wards.filter(w => w.id !== id));
  };

  return (
    <div>
      {/* Ward Types Pills */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`subtab-pill ${selectedWardFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedWardFilter('all')}
        >
          <BedDouble size={15} /> All Wards ({wards.length})
        </button>
        {wardTypes.map((wt) => (
          <button
            key={wt}
            className={`subtab-pill ${selectedWardFilter === wt ? 'active' : ''}`}
            onClick={() => setSelectedWardFilter(wt)}
          >
            {wt}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search wards by name, supervisor or protocol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register New Ward
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {wards
          .filter(w => (selectedWardFilter === 'all' || w.type === selectedWardFilter) && (w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.supervisor.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((ward) => {
            const occupancyPct = Math.round((ward.occupied / ward.capacity) * 100);
            return (
              <div key={ward.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-info">{ward.type}</span>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.375rem' }}>
                      {ward.name}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      className="action-btn edit"
                      onClick={() => setSelectedWardPolicy(ward)}
                      title="Ward Protocols & Escalation Rules"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(ward.id)}
                      title="Delete Ward"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Occupancy Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Occupancy ({ward.occupied} / {ward.capacity} Beds)</span>
                    <strong style={{ color: occupancyPct > 85 ? 'var(--danger)' : 'var(--primary)' }}>{occupancyPct}% Full</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${occupancyPct}%`,
                        height: '100%',
                        backgroundColor: occupancyPct > 85 ? 'var(--danger)' : occupancyPct > 70 ? 'var(--warning)' : 'var(--primary)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                {/* Supervisor & Staff Team */}
                <div style={{ fontSize: '0.8125rem', backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div>
                    <strong>Ward Supervisor:</strong> {ward.supervisor}
                  </div>
                  <div>
                    <strong>Nursing Team:</strong> {ward.nursingTeam}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <strong>Infection Protocol:</strong> {ward.infectionProtocol}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Ward Configuration & Protocols Modal */}
      {selectedWardPolicy && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedWardPolicy.name} — Ward Configuration</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Supervisor: {selectedWardPolicy.supervisor}</p>
              </div>
              <button className="action-btn" onClick={() => setSelectedWardPolicy(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--secondary)' }}>
                  1. Bed Allocation & Admission Rules
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedWardPolicy.allocationRules}</p>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--secondary)' }}>
                  2. Infection Control & Barrier Protocols
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedWardPolicy.infectionProtocol}</p>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--secondary)' }}>
                  3. Critical Escalation Matrix
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedWardPolicy.escalationMatrix}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => setSelectedWardPolicy(null)}>
                  Close Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Ward Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Ward</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ward Name</label>
                <input className="form-input" placeholder="e.g. Surgical Recovery Ward 3A" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Ward Classification</label>
                <select className="form-select" onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  {wardTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bed Capacity</label>
                <input type="number" className="form-input" placeholder="30" onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Ward Supervisor</label>
                <input className="form-input" placeholder="e.g. Sister Abigail Brown, RN" onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nursing Team Details</label>
                <input className="form-input" placeholder="e.g. 8 Shift Nurses (Shift A/B/C)" onChange={(e) => setFormData({ ...formData, nursingTeam: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Infection Control Protocols</label>
                <input className="form-input" placeholder="e.g. Contact & Airborne Precaution" onChange={(e) => setFormData({ ...formData, infectionProtocol: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
