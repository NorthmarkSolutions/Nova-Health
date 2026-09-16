import React, { useState } from 'react';
import {
  Building,
  Flame,
  KeyRound,
  Shield,
  Video,
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Zap,
  Box,
} from 'lucide-react';

export const BuildingsSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const [buildings, setBuildings] = useState([
    {
      id: '1',
      code: 'BLD-MAIN',
      name: 'Main Hospital Tower',
      floors: 5,
      fireZones: 'Zone A & B (Smoke Detectors + Wet Risers)',
      liftZones: '4 Passenger Lifts + 2 Stretcher / Bed Lifts',
      accessControl: 'RFID Smart Card + Biometric (Staff Only)',
      utilities: 'Dual Substation Power (500kVA DG Backup), Oxygen Manifold',
      cctvCameras: 64,
      assetsMapped: 340,
      status: 'OPERATIONAL',
    },
    {
      id: '2',
      code: 'BLD-ER',
      name: 'Emergency & Trauma Center (Red Block)',
      floors: 2,
      fireZones: 'Zone E (Dedicated ER Suppression)',
      liftZones: '2 Heavy Duty Stretcher Lifts',
      accessControl: 'High Security (Facial Recognition at Decontamination)',
      utilities: 'Dedicated UPS 100kVA + Central Medical Gas Pipeline System',
      cctvCameras: 28,
      assetsMapped: 120,
      status: 'OPERATIONAL',
    },
    {
      id: '3',
      code: 'BLD-CANCER',
      name: 'Comprehensive Cancer Center & Radiotherapy',
      floors: 3,
      fireZones: 'Zone C (Bunker Shielding & Clean Agent FM200)',
      liftZones: '2 Patient Lifts',
      accessControl: 'Radiation Controlled Area Access Badge',
      utilities: 'Linear Accelerator 3-Phase Chiller & High Voltage Feeder',
      cctvCameras: 32,
      assetsMapped: 85,
      status: 'OPERATIONAL',
    },
    {
      id: '4',
      code: 'BLD-DIAG',
      name: 'Advanced Diagnostic & Imaging Pavilion',
      floors: 3,
      fireZones: 'Zone D (Pre-action Sprinklers for MRI/CT rooms)',
      liftZones: '2 Hydraulic Lifts',
      accessControl: 'Keypad & Proximity Card Readers',
      utilities: 'Liquid Helium Cryogenic Feed + PACS Server Power Bank',
      cctvCameras: 36,
      assetsMapped: 150,
      status: 'OPERATIONAL',
    },
    {
      id: '5',
      code: 'BLD-OPD',
      name: 'Outpatient Clinic & Daycare Block',
      floors: 4,
      fireZones: 'Zone OPD-1 & 2',
      liftZones: '3 High Speed Elevators',
      accessControl: 'Standard Business Hours Open, Night Turnstiles',
      utilities: 'Central HVAC System + Solar Grid Supplemental',
      cctvCameras: 44,
      assetsMapped: 210,
      status: 'OPERATIONAL',
    },
    {
      id: '6',
      code: 'BLD-IPD',
      name: 'Inpatient Specialty Wards & Critical Care',
      floors: 5,
      fireZones: 'Zone IPD-1 to 5',
      liftZones: '4 Bed & Clean Supply Lifts',
      accessControl: 'Visitor Smart Barcode Gate System',
      utilities: 'Central Vacuum, Compressed Air, Suction Points at every Bed',
      cctvCameras: 58,
      assetsMapped: 410,
      status: 'OPERATIONAL',
    },
    {
      id: '7',
      code: 'BLD-RES',
      name: 'Clinical Research & Bio-Bank Wing',
      floors: 2,
      fireZones: 'Zone R (Clean Room HEPA & Inert Gas)',
      liftZones: '1 Service Lift',
      accessControl: 'Tier 3 Biometric Strict Authorization',
      utilities: '-80°C Ultra-low Freezer Power Backup Banks',
      cctvCameras: 18,
      assetsMapped: 95,
      status: 'OPERATIONAL',
    },
    {
      id: '8',
      code: 'BLD-ADM',
      name: 'Executive & Administrative Block',
      floors: 3,
      fireZones: 'Zone ADM-1',
      liftZones: '2 Passenger Lifts',
      accessControl: 'RFID Card Badge',
      utilities: 'Standard Commercial Grid + Server Room Firewall',
      cctvCameras: 22,
      assetsMapped: 80,
      status: 'OPERATIONAL',
    },
  ]);

  const handleOpenAdd = () => {
    setFormData({ floors: 1, cctvCameras: 10, assetsMapped: 20, status: 'OPERATIONAL' });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBuildings([...buildings, { ...formData, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setBuildings(buildings.filter(b => b.id !== id));
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search campus buildings by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register New Building
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {buildings
          .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.code.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((bld) => (
            <div key={bld.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info">{bld.code}</span>
                    <span className="badge badge-success">{bld.status}</span>
                  </div>
                  <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.375rem' }}>
                    {bld.name}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="action-btn delete" onClick={() => handleDelete(bld.id)} title="Delete Building">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Building Infrastructure Blueprint Specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem', backgroundColor: 'var(--bg-subtle)', padding: '0.875rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={14} color="var(--primary)" />
                  <span><strong>Floors:</strong> {bld.floors} Total Levels</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame size={14} color="var(--danger)" />
                  <span><strong>Fire Zones:</strong> {bld.fireZones}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={14} color="var(--warning)" />
                  <span><strong>Lift Zones:</strong> {bld.liftZones}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <KeyRound size={14} color="var(--teal)" />
                  <span><strong>Access Security:</strong> {bld.accessControl}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Video size={14} color="var(--secondary)" />
                  <span><strong>CCTV Surveillance:</strong> {bld.cctvCameras} High-Res Cameras</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={14} color="var(--primary)" />
                  <span><strong>Assets Mapped:</strong> {bld.assetsMapped} Equipment Items</span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Critical Utilities:</strong> {bld.utilities}
              </div>
            </div>
          ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Building</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Building Code</label>
                <input className="form-input" placeholder="e.g. BLD-HEART" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Building Name</label>
                <input className="form-input" placeholder="e.g. Heart & Vascular Institute" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Floors</label>
                <input type="number" className="form-input" placeholder="4" onChange={(e) => setFormData({ ...formData, floors: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label">CCTV Cameras Count</label>
                <input type="number" className="form-input" placeholder="30" onChange={(e) => setFormData({ ...formData, cctvCameras: Number(e.target.value) })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Fire Zone & Suppression Protocol</label>
                <input className="form-input" placeholder="Zone H (Sprinklers & Clean Gas)" onChange={(e) => setFormData({ ...formData, fireZones: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Lift Zones & Elevator Spec</label>
                <input className="form-input" placeholder="2 Bed Lifts + 2 Passenger Lifts" onChange={(e) => setFormData({ ...formData, liftZones: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Access Control Protocols</label>
                <input className="form-input" placeholder="Biometric Smart Turnstiles" onChange={(e) => setFormData({ ...formData, accessControl: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
