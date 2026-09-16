import React, { useState } from 'react';
import {
  BedDouble,
  Plus,
  Search,
  ArrowRight,
  ArrowRightLeft,
  Lock,
  Calendar,
  Sparkles,
  Wrench,
  BarChart3,
  X,
  CheckCircle,
  AlertCircle,
  User,
} from 'lucide-react';
import api from '../../../../services/api';

export const BedsSection: React.FC = () => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // 7 Bed Lifecycle States
  // AVAILABLE -> RESERVED -> OCCUPIED -> DISCHARGE_INITIATED -> CLEANING_REQUIRED -> INSPECTION -> AVAILABLE
  const [beds, setBeds] = useState([
    {
      id: '1',
      bedNumber: 'ICU-BED-01',
      ward: 'Intensive Critical Care Unit (ICU)',
      category: 'Motorized ICU Ventilator Bed',
      status: 'OCCUPIED',
      patientName: 'James Sullivan',
      uhid: 'UHID-1049',
      admittedOn: '2026-09-12 14:30',
      dailyTariff: '$1,200',
    },
    {
      id: '2',
      bedNumber: 'ICU-BED-02',
      ward: 'Intensive Critical Care Unit (ICU)',
      category: 'Motorized ICU Ventilator Bed',
      status: 'AVAILABLE',
      patientName: '-',
      uhid: '-',
      admittedOn: '-',
      dailyTariff: '$1,200',
    },
    {
      id: '3',
      bedNumber: 'ICU-BED-03',
      ward: 'Intensive Critical Care Unit (ICU)',
      category: 'Motorized ICU Ventilator Bed',
      status: 'RESERVED',
      patientName: 'Robert Langdon (OT Post-Op)',
      uhid: 'UHID-2831',
      admittedOn: 'ETA: 16:30 Today',
      dailyTariff: '$1,200',
    },
    {
      id: '4',
      bedNumber: 'GW-MALE-101',
      ward: 'Male Surgical Inpatient Ward',
      category: 'Standard Semi-Fowler Bed',
      status: 'DISCHARGE_INITIATED',
      patientName: 'David Miller',
      uhid: 'UHID-1102',
      admittedOn: '2026-09-10 09:00',
      dailyTariff: '$250',
    },
    {
      id: '5',
      bedNumber: 'GW-MALE-102',
      ward: 'Male Surgical Inpatient Ward',
      category: 'Standard Semi-Fowler Bed',
      status: 'CLEANING_REQUIRED',
      patientName: '-',
      uhid: '-',
      admittedOn: '-',
      dailyTariff: '$250',
    },
    {
      id: '6',
      bedNumber: 'GW-MALE-103',
      ward: 'Male Surgical Inpatient Ward',
      category: 'Standard Semi-Fowler Bed',
      status: 'INSPECTION',
      patientName: '-',
      uhid: '-',
      admittedOn: '-',
      dailyTariff: '$250',
    },
    {
      id: '7',
      bedNumber: 'VIP-SUITE-201',
      ward: 'Executive Presidential VIP Wing',
      category: 'Electric Luxury Bed with Attendant Lounge',
      status: 'OCCUPIED',
      patientName: 'Lady Eleanor Vance',
      uhid: 'UHID-0092',
      admittedOn: '2026-09-14 11:15',
      dailyTariff: '$650',
    },
    {
      id: '8',
      bedNumber: 'NICU-WARM-01',
      ward: 'Neonatal Intensive Care Unit (NICU)',
      category: 'Infant Radiant Warmer Incubator',
      status: 'OCCUPIED',
      patientName: 'Baby of Clara Oswald',
      uhid: 'UHID-3310',
      admittedOn: '2026-09-15 02:40',
      dailyTariff: '$800',
    },
    {
      id: '9',
      bedNumber: 'ISO-BED-301',
      ward: 'Negative Pressure Bio-Isolation Ward',
      category: 'Negative Pressure Barrier Bed',
      status: 'BLOCKED',
      patientName: 'Under UV Sterilization & Calibration',
      uhid: '-',
      admittedOn: '-',
      dailyTariff: '$500',
    },
  ]);

  React.useEffect(() => {
    api.get('/organization/beds')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setBeds(res.data);
          setIsBackendConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Using local bed data cache:', err);
      });
  }, []);

  // Step Transitions
  const handleTransition = (bedId: string, targetStatus: string) => {
    setBeds(beds.map(b => {
      if (b.id === bedId) {
        let updatedPatient = b.patientName;
        let updatedUhid = b.uhid;
        let updatedAdmit = b.admittedOn;

        if (targetStatus === 'CLEANING_REQUIRED' || targetStatus === 'INSPECTION' || targetStatus === 'AVAILABLE') {
          if (b.status === 'DISCHARGE_INITIATED' || b.status === 'CLEANING_REQUIRED') {
            updatedPatient = '-';
            updatedUhid = '-';
            updatedAdmit = '-';
          }
        }
        return {
          ...b,
          status: targetStatus,
          patientName: updatedPatient,
          uhid: updatedUhid,
          admittedOn: updatedAdmit,
        };
      }
      return b;
    }));

    // Persist to live backend if available
    api.patch(`/organization/beds/${bedId}/status`, { status: targetStatus }).catch(() => {});
  };

  const handleOpenTransfer = (bed: any) => {
    setSelectedBed(bed);
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBed) {
      setBeds(beds.map(b => {
        if (b.id === selectedBed.id) {
          return { ...b, status: 'CLEANING_REQUIRED', patientName: '-', uhid: '-' };
        }
        return b;
      }));
    }
    setIsTransferModalOpen(false);
  };

  const handleOpenAdd = () => {
    setFormData({
      status: 'AVAILABLE',
      patientName: '-',
      uhid: '-',
      admittedOn: '-',
      dailyTariff: '$300',
    });
    setIsModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setBeds([...beds, { ...formData, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  // KPI calculations
  const totalBeds = beds.length;
  const availableBeds = beds.filter(b => b.status === 'AVAILABLE').length;
  const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED').length;
  const reservedBeds = beds.filter(b => b.status === 'RESERVED').length;
  const turnoverBeds = beds.filter(b => b.status === 'DISCHARGE_INITIATED' || b.status === 'CLEANING_REQUIRED' || b.status === 'INSPECTION').length;
  const blockedBeds = beds.filter(b => b.status === 'BLOCKED').length;

  return (
    <div>
      {/* Visual Bed Lifecycle Pipeline Banner */}
      <div className="card" style={{ marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Standard Hospital Bed Lifecycle Protocol
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Every bed strictly transitions through the infection-control and housekeeping pipeline
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isBackendConnected && (
              <span className="badge badge-success">
                <CheckCircle size={12} /> Live SQLite Backend Synchronized
              </span>
            )}
            <span className="badge badge-info">NABH Standard Flow</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', padding: '0.5rem 0', gap: '0.5rem' }}>
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--success-light)', color: '#065f46', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            1. AVAILABLE
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            2. RESERVED
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--danger-light)', color: '#991b1b', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            3. OCCUPIED
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--warning-light)', color: '#92400e', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            4. DISCHARGE INITIATED
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            5. CLEANING REQUIRED
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--teal-light)', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            6. INSPECTION
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', backgroundColor: 'var(--success-light)', color: '#065f46', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            7. AVAILABLE
          </div>
        </div>
      </div>

      {/* Bed Registry Live KPI Ribbon */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{totalBeds}</div>
            <div className="stat-label">Total Bed Registry</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--success)' }}>{availableBeds}</div>
            <div className="stat-label">Available Ready</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>{occupiedBeds}</div>
            <div className="stat-label">Occupied (Admitted)</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{reservedBeds}</div>
            <div className="stat-label">Reserved (Pre-Auth/OT)</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--warning)' }}>{turnoverBeds}</div>
            <div className="stat-label">Sanitation Turnover</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '0.875rem' }}>
          <div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>{blockedBeds}</div>
            <div className="stat-label">Blocked / Maintenance</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`subtab-pill ${selectedStatusFilter === 'ALL' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('ALL')}>
          All Beds ({totalBeds})
        </button>
        <button className={`subtab-pill ${selectedStatusFilter === 'AVAILABLE' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('AVAILABLE')}>
          Available ({availableBeds})
        </button>
        <button className={`subtab-pill ${selectedStatusFilter === 'OCCUPIED' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('OCCUPIED')}>
          Occupied ({occupiedBeds})
        </button>
        <button className={`subtab-pill ${selectedStatusFilter === 'RESERVED' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('RESERVED')}>
          Reserved ({reservedBeds})
        </button>
        <button className={`subtab-pill ${selectedStatusFilter === 'TURNOVER' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('TURNOVER')}>
          Turnover / Cleaning ({turnoverBeds})
        </button>
        <button className={`subtab-pill ${selectedStatusFilter === 'BLOCKED' ? 'active' : ''}`} onClick={() => setSelectedStatusFilter('BLOCKED')}>
          Blocked ({blockedBeds})
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search beds by ID, ward, patient name or UHID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Add Bed to Registry
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Bed Number</th>
              <th>Ward Location</th>
              <th>Bed Category</th>
              <th>Daily Tariff</th>
              <th>Lifecycle Status</th>
              <th>Admitted Patient & UHID</th>
              <th style={{ textAlign: 'right' }}>Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody>
            {beds
              .filter(b => {
                if (selectedStatusFilter === 'TURNOVER') {
                  return b.status === 'DISCHARGE_INITIATED' || b.status === 'CLEANING_REQUIRED' || b.status === 'INSPECTION';
                }
                if (selectedStatusFilter !== 'ALL') {
                  return b.status === selectedStatusFilter;
                }
                return true;
              })
              .filter(b => b.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) || b.ward.toLowerCase().includes(searchQuery.toLowerCase()) || b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || b.uhid.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((bed) => (
                <tr key={bed.id}>
                  <td><strong>{bed.bedNumber}</strong></td>
                  <td>{bed.ward}</td>
                  <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{bed.category}</span></td>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{bed.dailyTariff}/day</span></td>
                  <td>
                    <span
                      className={`badge ${
                        bed.status === 'AVAILABLE'
                          ? 'badge-success'
                          : bed.status === 'OCCUPIED'
                          ? 'badge-danger'
                          : bed.status === 'RESERVED'
                          ? 'badge-info'
                          : bed.status === 'DISCHARGE_INITIATED'
                          ? 'badge-warning'
                          : bed.status === 'CLEANING_REQUIRED'
                          ? 'badge-danger'
                          : 'badge-secondary'
                      }`}
                    >
                      {bed.status}
                    </span>
                  </td>
                  <td>
                    {bed.patientName !== '-' ? (
                      <div>
                        <strong>{bed.patientName}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bed.uhid} • {bed.admittedOn}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>None</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      {bed.status === 'AVAILABLE' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleTransition(bed.id, 'RESERVED')}
                          >
                            Reserve
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleTransition(bed.id, 'OCCUPIED')}
                          >
                            Admit
                          </button>
                        </>
                      )}

                      {bed.status === 'RESERVED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleTransition(bed.id, 'OCCUPIED')}
                        >
                          Confirm Admit
                        </button>
                      )}

                      {bed.status === 'OCCUPIED' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenTransfer(bed)}
                            title="Transfer Patient to another Ward/Bed"
                          >
                            <ArrowRightLeft size={12} /> Transfer
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleTransition(bed.id, 'DISCHARGE_INITIATED')}
                          >
                            Discharge
                          </button>
                        </>
                      )}

                      {bed.status === 'DISCHARGE_INITIATED' && (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => handleTransition(bed.id, 'CLEANING_REQUIRED')}
                        >
                          Send to Cleaning
                        </button>
                      )}

                      {bed.status === 'CLEANING_REQUIRED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleTransition(bed.id, 'INSPECTION')}
                        >
                          <Sparkles size={12} /> Completed Cleaning
                        </button>
                      )}

                      {bed.status === 'INSPECTION' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleTransition(bed.id, 'AVAILABLE')}
                        >
                          <CheckCircle size={12} /> Pass & Release
                        </button>
                      )}

                      {bed.status === 'BLOCKED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleTransition(bed.id, 'AVAILABLE')}
                        >
                          Unblock Bed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Bed Transfer Modal */}
      {isTransferModalOpen && selectedBed && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Initiate Clinical Bed Transfer</h3>
              <button className="action-btn" onClick={() => setIsTransferModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.875rem' }}>
                Transferring <strong>{selectedBed.patientName}</strong> ({selectedBed.uhid}) from <strong>{selectedBed.bedNumber} ({selectedBed.ward})</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Ward</label>
                <select className="form-select">
                  <option>Intensive Critical Care Unit (ICU)</option>
                  <option>General Medical Ward</option>
                  <option>Male Surgical Inpatient Ward</option>
                  <option>Executive Presidential VIP Wing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Bed Number</label>
                <input className="form-input" placeholder="e.g. ICU-BED-02" required />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Transfer Reason / SBAR Note</label>
                <textarea rows={2} className="form-textarea" placeholder="Step-down to General Ward post hemodynamic stabilization" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Transfer & Release Old Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add Bed to Hospital Registry</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Bed Identifier</label>
                <input className="form-input" placeholder="e.g. ICU-BED-06" onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Ward</label>
                <input className="form-input" placeholder="e.g. Intensive Critical Care Unit (ICU)" onChange={(e) => setFormData({ ...formData, ward: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Bed Category / Model</label>
                <input className="form-input" placeholder="e.g. Motorized ICU Ventilator Bed" onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Daily Tariff Rate</label>
                <input className="form-input" placeholder="e.g. $1,200" onChange={(e) => setFormData({ ...formData, dailyTariff: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Bed to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
