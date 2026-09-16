import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  Activity,
  Layers,
  BedDouble,
  DoorClosed,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  Archive,
} from 'lucide-react';

export const BranchesSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const [branches, setBranches] = useState([
    {
      id: '1',
      code: 'NH-MAIN',
      name: 'North Hospital Main Multi-Specialty Campus',
      city: 'Metro Central, NY',
      address: '452 Healthcare Boulevard, Medical District, NY 10001',
      phone: '+1 555-019-2834',
      hours: '24/7 (All Departments)',
      infrastructure: { buildings: 4, floors: 5, wards: 8, rooms: 120, beds: 350 },
      services: { opd: true, ipd: true, emergency: true, icu: true, ot: true, lab: true, radiology: true, pharmacy: true },
      performance: { occupancy: '84%', revenueToday: '$24,500', patientVolume: '240 Visits', utilization: '92%' },
      status: 'ACTIVE',
    },
    {
      id: '2',
      code: 'NH-NORTH',
      name: 'North City Specialty OPD & Daycare Clinic',
      city: 'North District, NY',
      address: '88 North Uptown Square, Suite 400, NY 10024',
      phone: '+1 555-014-9821',
      hours: 'Mon - Sat (08:00 - 20:00)',
      infrastructure: { buildings: 1, floors: 2, wards: 2, rooms: 24, beds: 60 },
      services: { opd: true, ipd: false, emergency: false, icu: false, ot: true, lab: true, radiology: true, pharmacy: true },
      performance: { occupancy: '62%', revenueToday: '$8,400', patientVolume: '85 Visits', utilization: '78%' },
      status: 'ACTIVE',
    },
    {
      id: '3',
      code: 'NH-WEST',
      name: 'West Valley Satellite Dialysis & Diagnostics',
      city: 'West Valley, NJ',
      address: '12 West Valley Medical Center Way, NJ 07030',
      phone: '+1 555-018-7711',
      hours: 'Mon - Sun (06:00 - 22:00)',
      infrastructure: { buildings: 1, floors: 1, wards: 1, rooms: 12, beds: 25 },
      services: { opd: true, ipd: false, emergency: false, icu: false, ot: false, lab: true, radiology: false, pharmacy: true },
      performance: { occupancy: '90%', revenueToday: '$4,200', patientVolume: '45 Visits', utilization: '88%' },
      status: 'ACTIVE',
    },
  ]);

  const handleOpenAdd = () => {
    setFormData({
      services: { opd: true, ipd: true, emergency: true, icu: true, ot: true, lab: true, radiology: true, pharmacy: true },
      infrastructure: { buildings: 1, floors: 1, wards: 1, rooms: 10, beds: 20 },
      performance: { occupancy: '0%', revenueToday: '$0', patientVolume: '0', utilization: '0%' },
    });
    setSelectedBranch(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBranch) {
      setBranches(branches.map(b => b.id === selectedBranch.id ? { ...b, ...formData } : b));
    } else {
      setBranches([...branches, { ...formData, id: Date.now().toString(), status: 'ACTIVE' }]);
    }
    setIsModalOpen(false);
  };

  const handleToggleService = (branchId: string, serviceKey: string) => {
    setBranches(branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          services: {
            ...b.services,
            [serviceKey]: !(b.services as any)[serviceKey],
          },
        };
      }
      return b;
    }));
  };

  const handleCloseBranch = (id: string) => {
    setBranches(branches.map(b => b.id === id ? { ...b, status: b.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE' } : b));
  };

  const handleArchive = (id: string) => {
    setBranches(branches.filter(b => b.id !== id));
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search branches by code, name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register New Branch
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {branches
          .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.code.toLowerCase().includes(searchQuery.toLowerCase()) || b.city.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((branch) => (
            <div key={branch.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span className="badge badge-info">{branch.code}</span>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>{branch.name}</h4>
                    <span className={`badge ${branch.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {branch.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {branch.address} • {branch.phone} • <strong>Hours:</strong> {branch.hours}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCloseBranch(branch.id)}
                  >
                    {branch.status === 'ACTIVE' ? 'Close Branch' : 'Reactivate Branch'}
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleArchive(branch.id)}
                    title="Archive Branch"
                  >
                    <Archive size={14} />
                  </button>
                </div>
              </div>

              {/* Infrastructure & Performance Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Infrastructure</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {branch.infrastructure.buildings} Buildings • {branch.infrastructure.floors} Floors • {branch.infrastructure.beds} Beds
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Occupancy Rate</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {branch.performance.occupancy}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Revenue</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)' }}>
                    {branch.performance.revenueToday}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Patient Volume</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--teal)' }}>
                    {branch.performance.patientVolume}
                  </div>
                </div>
              </div>

              {/* Branch Services Active Matrix */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                  Branch Active Clinical Services Catalogue:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(branch.services).map(([srvKey, isEnabled]) => (
                    <button
                      key={srvKey}
                      onClick={() => handleToggleService(branch.id, srvKey)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isEnabled ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: isEnabled ? 'var(--primary-light)' : 'var(--bg-surface)',
                        color: isEnabled ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <CheckCircle2 size={12} color={isEnabled ? 'var(--primary)' : 'transparent'} />
                      {srvKey}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Branch</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Branch Code</label>
                <input className="form-input" placeholder="e.g. NH-SOUTH" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input className="form-input" placeholder="e.g. South Valley Care Center" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">City / Region</label>
                <input className="form-input" placeholder="e.g. Brooklyn, NY" onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input className="form-input" placeholder="+1 555-019-8800" onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Street Address</label>
                <input className="form-input" placeholder="104 South Medical Parkway" onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Operating Hours</label>
                <input className="form-input" placeholder="24/7 or 08:00 - 20:00" onChange={(e) => setFormData({ ...formData, hours: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Bed Capacity</label>
                <input type="number" className="form-input" placeholder="50" onChange={(e) => setFormData({ ...formData, infrastructure: { ...formData.infrastructure, beds: Number(e.target.value) } })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Branch Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
