import React, { useState } from 'react';
import {
  DoorClosed,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Wrench,
  BedDouble,
  SlidersHorizontal,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const RoomsSection: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const roomTypes = [
    'OPD Rooms',
    'Consultation Rooms',
    'ICU Rooms',
    'OT Rooms',
    'Procedure Rooms',
    'Ward Rooms',
    'Recovery Rooms',
    'Isolation Rooms',
    'Deluxe Rooms',
  ];

  const [rooms, setRooms] = useState([
    {
      id: '1',
      roomNumber: 'OPD-101',
      type: 'Consultation Rooms',
      department: 'General Medicine',
      bedCapacity: 0,
      equipment: ['Examination Couch', 'Digital Sphygmomanometer', 'Ophthalmoscope', 'EHR Terminal'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '2',
      roomNumber: 'OPD-102',
      type: 'Consultation Rooms',
      department: 'Cardiology',
      bedCapacity: 0,
      equipment: ['Echo Couch', '12-Lead ECG Machine', 'Doppler Stethoscope', 'EHR Terminal'],
      availabilityStatus: 'OCCUPIED',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '3',
      roomNumber: 'ICU-CUBICLE-01',
      type: 'ICU Rooms',
      department: 'Critical Care ICU',
      bedCapacity: 1,
      equipment: ['Servo-u Ventilator', 'Multi-Para Monitor', 'Syringe Infusion Pumps (x4)', 'Defibrillator', 'Suction/Oxygen Ports'],
      availabilityStatus: 'OCCUPIED',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '4',
      roomNumber: 'ICU-CUBICLE-02',
      type: 'ICU Rooms',
      department: 'Critical Care ICU',
      bedCapacity: 1,
      equipment: ['Hamilton Ventilator', 'Invasive Arterial BP Monitor', 'Crash Cart Access'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '5',
      roomNumber: 'OT-SUITE-A',
      type: 'OT Rooms',
      department: 'Surgery & OT',
      bedCapacity: 1,
      equipment: ['Dräger Anesthesia Workstation', 'Laminar Air Flow System', 'High-Frequency C-Arm X-Ray', 'Electrosurgical Cautery Unit'],
      availabilityStatus: 'OCCUPIED',
      cleaningStatus: 'CLEANING_IN_PROGRESS',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '6',
      roomNumber: 'PROC-ROOM-105',
      type: 'Procedure Rooms',
      department: 'Emergency Trauma',
      bedCapacity: 1,
      equipment: ['Hydraulic Minor OT Table', 'Shadowless Surgical LED Lamp', 'Suture Instruments Set'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'DIRTY',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '7',
      roomNumber: 'ISO-SUITE-301',
      type: 'Isolation Rooms',
      department: 'Infectious Disease Ward',
      bedCapacity: 1,
      equipment: ['Negative Pressure HVAC Air Handler', 'HEPA Filtration Unit', 'Dedicated Anteroom Sink', 'Automated Sanitizer'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '8',
      roomNumber: 'VIP-DELUXE-201',
      type: 'Deluxe Rooms',
      department: 'Inpatient Private Suites',
      bedCapacity: 1,
      equipment: ['Hill-Rom Smart Electric Bed', 'Attendant Sleeper Sofa', 'Smart Patient Entertainment Console', 'Microwave & Refrigerator'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    },
    {
      id: '9',
      roomNumber: 'PACU-RECOV-01',
      type: 'Recovery Rooms',
      department: 'Post-Anesthesia Care (PACU)',
      bedCapacity: 4,
      equipment: ['4x Vital Signs Patient Monitors', 'Central Oxygen & Warming Blankets'],
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'UNDER_MAINTENANCE',
    },
  ]);

  const handleOpenAdd = () => {
    setFormData({
      type: 'Consultation Rooms',
      bedCapacity: 0,
      availabilityStatus: 'AVAILABLE',
      cleaningStatus: 'CLEAN',
      maintenanceStatus: 'NORMAL',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const equipArray = typeof formData.equipment === 'string'
      ? formData.equipment.split(',').map((s: string) => s.trim())
      : ['Basic Clinical Desk'];
    setRooms([...rooms, { ...formData, equipment: equipArray, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const handleToggleCleaning = (id: string) => {
    setRooms(rooms.map(r => {
      if (r.id === id) {
        const nextStatus = r.cleaningStatus === 'CLEAN' ? 'DIRTY' : r.cleaningStatus === 'DIRTY' ? 'CLEANING_IN_PROGRESS' : 'CLEAN';
        return { ...r, cleaningStatus: nextStatus };
      }
      return r;
    }));
  };

  return (
    <div>
      {/* Room Types Pills */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`subtab-pill ${selectedType === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedType('all')}
        >
          <DoorClosed size={15} /> All Rooms ({rooms.length})
        </button>
        {roomTypes.map((rt) => (
          <button
            key={rt}
            className={`subtab-pill ${selectedType === rt ? 'active' : ''}`}
            onClick={() => setSelectedType(rt)}
          >
            {rt}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search rooms by number, department, or equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register New Room
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Room Type</th>
              <th>Department</th>
              <th>Beds</th>
              <th>Equipment Mapping</th>
              <th>Availability</th>
              <th>Sanitation / Cleaning</th>
              <th>Maintenance</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms
              .filter(r => (selectedType === 'all' || r.type === selectedType) && (r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || r.department.toLowerCase().includes(searchQuery.toLowerCase())))
              .map((room) => (
                <tr key={room.id}>
                  <td><strong>{room.roomNumber}</strong></td>
                  <td><span className="badge badge-info">{room.type}</span></td>
                  <td>{room.department}</td>
                  <td><strong>{room.bedCapacity > 0 ? `${room.bedCapacity} Bed(s)` : 'No Bed'}</strong></td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                      {room.equipment.join(' • ')}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        room.availabilityStatus === 'AVAILABLE'
                          ? 'badge-success'
                          : room.availabilityStatus === 'OCCUPIED'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {room.availabilityStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleCleaning(room.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Click to toggle Cleaning state"
                    >
                      <span
                        className={`badge ${
                          room.cleaningStatus === 'CLEAN'
                            ? 'badge-success'
                            : room.cleaningStatus === 'DIRTY'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        <Sparkles size={11} /> {room.cleaningStatus}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        room.maintenanceStatus === 'NORMAL'
                          ? 'badge-secondary'
                          : 'badge-warning'
                      }`}
                    >
                      {room.maintenanceStatus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button className="action-btn delete" onClick={() => handleDelete(room.id)} title="Delete Room">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Hospital Room</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Room Number / ID</label>
                <input className="form-input" placeholder="e.g. OPD-109 or ICU-05" onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Room Classification</label>
                <select className="form-select" onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  {roomTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department Mapping</label>
                <input className="form-input" placeholder="e.g. Cardiology OPD or Surgery" onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Bed Capacity</label>
                <input type="number" className="form-input" placeholder="1" onChange={(e) => setFormData({ ...formData, bedCapacity: Number(e.target.value) })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Equipment Mapping (comma-separated)</label>
                <input className="form-input" placeholder="Ventilator, Arterial Monitor, Suction Unit" onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} required />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
