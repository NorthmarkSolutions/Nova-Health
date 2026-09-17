import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Layers,
  BedDouble,
  DoorClosed,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Search,
  Filter,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  BuildingNode,
  FloorNode,
  WardNode,
  RoomNode,
  getCampusBuildings,
  saveCampusBuildings,
} from './CampusInfrastructureSection';
import { DepartmentProfileData } from './DepartmentProfileView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentProfileData[];
  onDepartmentUpdated: (updatedDepts: DepartmentProfileData[]) => void;
}

export const CampusSpaceAllocationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  departments,
  onDepartmentUpdated,
}) => {
  const [buildings, setBuildings] = useState<BuildingNode[]>(() => getCampusBuildings());
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    buildings[0]?.id || 'bld-main-1'
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  const currentBuilding = useMemo(() => {
    return buildings.find((b) => b.id === selectedBuildingId) || buildings[0];
  }, [buildings, selectedBuildingId]);

  // Global Campus Allocation Stats
  const campusStats = useMemo(() => {
    let totalWards = 0;
    let assignedWards = 0;
    let totalRooms = 0;
    let assignedRooms = 0;
    let totalBeds = 0;
    let assignedBeds = 0;

    buildings.forEach((b) => {
      b.floors.forEach((f) => {
        f.wards.forEach((w) => {
          totalWards++;
          totalBeds += w.beds.length;
          if (w.departmentName) {
            assignedWards++;
            assignedBeds += w.beds.length;
          }
        });
        f.rooms.forEach((r) => {
          totalRooms++;
          if (r.departmentName) {
            assignedRooms++;
          }
        });
      });
    });

    const unassignedWards = totalWards - assignedWards;
    const unassignedBeds = totalBeds - assignedBeds;
    const unassignedRooms = totalRooms - assignedRooms;
    const bedAllocationPercent = totalBeds > 0 ? Math.round((assignedBeds / totalBeds) * 100) : 0;

    return {
      totalWards,
      assignedWards,
      unassignedWards,
      totalRooms,
      assignedRooms,
      unassignedRooms,
      totalBeds,
      assignedBeds,
      unassignedBeds,
      bedAllocationPercent,
    };
  }, [buildings]);

  // Handle assigning a Ward to a Department
  const handleAssignWard = (wardId: string, deptName: string) => {
    const updatedBuildings = buildings.map((b) => {
      if (b.id !== selectedBuildingId) return b;
      return {
        ...b,
        floors: b.floors.map((f) => ({
          ...f,
          wards: f.wards.map((w) => {
            if (w.id === wardId) {
              return { ...w, departmentName: deptName === 'UNASSIGN' ? undefined : deptName };
            }
            return w;
          }),
        })),
      };
    });

    setBuildings(updatedBuildings);
    saveCampusBuildings(updatedBuildings);
    syncToDepartmentState(updatedBuildings);
  };

  // Handle assigning a Room to a Department
  const handleAssignRoom = (roomId: string, deptName: string) => {
    const updatedBuildings = buildings.map((b) => {
      if (b.id !== selectedBuildingId) return b;
      return {
        ...b,
        floors: b.floors.map((f) => ({
          ...f,
          rooms: f.rooms.map((r) => {
            if (r.id === roomId) {
              return { ...r, departmentName: deptName === 'UNASSIGN' ? undefined : deptName };
            }
            return r;
          }),
        })),
      };
    });

    setBuildings(updatedBuildings);
    saveCampusBuildings(updatedBuildings);
    syncToDepartmentState(updatedBuildings);
  };

  // Recalculate and update departments with new bed/room counts
  const syncToDepartmentState = (updatedBuildings: BuildingNode[]) => {
    const updatedDepts = departments.map((d) => {
      let bedsCount = 0;
      let roomsCount = 0;
      let wardsCount = 0;
      const assignedWardIds: string[] = [];
      const assignedRoomIds: string[] = [];

      updatedBuildings.forEach((b) => {
        b.floors.forEach((f) => {
          f.wards.forEach((w) => {
            if (w.departmentName === d.name) {
              wardsCount++;
              bedsCount += w.beds.length;
              assignedWardIds.push(w.id);
            }
          });
          f.rooms.forEach((r) => {
            if (r.departmentName === d.name) {
              roomsCount++;
              assignedRoomIds.push(r.id);
            }
          });
        });
      });

      return {
        ...d,
        bedsCount,
        roomsCount,
        wardsCount,
        assignedWardIds,
        assignedRoomIds,
      };
    });

    onDepartmentUpdated(updatedDepts);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '1000px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* ================= FIXED HEADER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    padding: '0.375rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  Campus Physical Asset Allocation Matrix
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Inspect hospital buildings, floors, wards, and rooms. Assign or transfer physical spaces to departments with 1-click.
              </span>
            </div>
            <button className="action-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>

          {/* KPI Ticker Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-subtle, #f9fafb)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Hospital Beds
              </span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-color)' }}>
                {campusStats.totalBeds} Beds
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                  across {campusStats.totalWards} Wards
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Allocated to Departments
              </span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#10b981' }}>
                {campusStats.assignedBeds} Beds ({campusStats.bedAllocationPercent}%)
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Unassigned / Available
              </span>
              <div
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: campusStats.unassignedBeds > 0 ? '#ea580c' : '#10b981',
                }}
              >
                {campusStats.unassignedBeds} Beds ({campusStats.unassignedWards} Wards)
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Consultation Chambers
              </span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>
                {campusStats.assignedRooms} / {campusStats.totalRooms} Assigned
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONTROLS & FILTERS ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Building Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Building:
            </span>
            <select
              className="form-select"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="search-input-box" style={{ width: '220px', padding: '0.25rem 0.5rem' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder="Search ward, room, dept..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{ fontSize: '0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className={`subtab-pill ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
                style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
              >
                All Spaces
              </button>
              <button
                type="button"
                className={`subtab-pill ${statusFilter === 'unassigned' ? 'active' : ''}`}
                onClick={() => setStatusFilter('unassigned')}
                style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
              >
                🟢 Unassigned Only
              </button>
              <button
                type="button"
                className={`subtab-pill ${statusFilter === 'assigned' ? 'active' : ''}`}
                onClick={() => setStatusFilter('assigned')}
                style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
              >
                🔒 Assigned Only
              </button>
            </div>
          </div>
        </div>

        {/* ================= SCROLLABLE BODY ================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-subtle, #f9fafb)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {currentBuilding?.floors.map((floor) => {
            const filteredWards = floor.wards.filter((w) => {
              const matchesSearch =
                !searchFilter ||
                w.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                w.wardType.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (w.departmentName && w.departmentName.toLowerCase().includes(searchFilter.toLowerCase()));

              const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'unassigned' && !w.departmentName) ||
                (statusFilter === 'assigned' && !!w.departmentName);

              return matchesSearch && matchesStatus;
            });

            const filteredRooms = floor.rooms.filter((r) => {
              const matchesSearch =
                !searchFilter ||
                r.roomNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                r.roomType.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (r.departmentName && r.departmentName.toLowerCase().includes(searchFilter.toLowerCase()));

              const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'unassigned' && !r.departmentName) ||
                (statusFilter === 'assigned' && !!r.departmentName);

              return matchesSearch && matchesStatus;
            });

            if (filteredWards.length === 0 && filteredRooms.length === 0) {
              return null;
            }

            return (
              <div
                key={floor.id}
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}
              >
                {/* Floor Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.9375rem' }}>
                      {floor.floorNumber} — {floor.wing}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({floor.accessZone})
                    </span>
                  </div>
                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                    {floor.wards.length} Wards • {floor.rooms.length} Rooms
                  </span>
                </div>

                {/* Clinical Inpatient Wards */}
                {filteredWards.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Inpatient Clinical Wards & Bed Units
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredWards.map((ward) => {
                        const isAssigned = !!ward.departmentName;
                        return (
                          <div
                            key={ward.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.75rem 1rem',
                              backgroundColor: isAssigned
                                ? 'rgba(37, 99, 235, 0.03)'
                                : 'rgba(234, 88, 12, 0.05)',
                              border: `1px solid ${isAssigned ? 'var(--border-color)' : '#fdba74'}`,
                              borderRadius: '8px',
                              flexWrap: 'wrap',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                              <span
                                style={{
                                  padding: '0.375rem',
                                  borderRadius: '6px',
                                  backgroundColor: isAssigned
                                    ? 'rgba(37, 99, 235, 0.1)'
                                    : 'rgba(234, 88, 12, 0.1)',
                                  color: isAssigned ? 'var(--primary)' : '#ea580c',
                                  marginTop: '2px',
                                }}
                              >
                                <BedDouble size={16} />
                              </span>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.875rem' }}>{ward.name}</strong>
                                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                                    {ward.wardType}
                                  </span>
                                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                                    {ward.beds.length} Beds
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Supervisor: Sister {ward.supervisorNurse} • Station: {ward.nursingStation}
                                </span>
                              </div>
                            </div>

                            {/* Department Assignment Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Governed by:
                              </span>
                              <select
                                className="form-select"
                                value={ward.departmentName || 'UNASSIGN'}
                                onChange={(e) => handleAssignWard(ward.id, e.target.value)}
                                style={{
                                  padding: '0.375rem 0.625rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  borderColor: isAssigned ? 'var(--primary)' : '#ea580c',
                                  color: isAssigned ? 'var(--text-color)' : '#c2410c',
                                  minWidth: '220px',
                                }}
                              >
                                <option value="UNASSIGN">🟢 Unassigned (Available Space)</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    🔒 {d.name} ({d.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Consultation Chambers & Procedure Rooms */}
                {filteredRooms.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Consultation Chambers, Clinics & Procedure Rooms
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredRooms.map((room) => {
                        const isAssigned = !!room.departmentName;
                        return (
                          <div
                            key={room.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.625rem 1rem',
                              backgroundColor: isAssigned
                                ? 'rgba(14, 165, 233, 0.03)'
                                : 'rgba(234, 88, 12, 0.05)',
                              border: `1px solid ${isAssigned ? 'var(--border-color)' : '#fdba74'}`,
                              borderRadius: '8px',
                              flexWrap: 'wrap',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span
                                style={{
                                  padding: '0.375rem',
                                  borderRadius: '6px',
                                  backgroundColor: isAssigned
                                    ? 'rgba(14, 165, 233, 0.1)'
                                    : 'rgba(234, 88, 12, 0.1)',
                                  color: isAssigned ? '#0ea5e9' : '#ea580c',
                                }}
                              >
                                <DoorClosed size={16} />
                              </span>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.8125rem' }}>
                                    Room {room.roomNumber}
                                  </strong>
                                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                                    {room.roomType}
                                  </span>
                                </div>
                                {room.attendingStaff?.doctorName && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Assigned Doctor: {room.attendingStaff.doctorName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Department Assignment Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Governed by:
                              </span>
                              <select
                                className="form-select"
                                value={room.departmentName || 'UNASSIGN'}
                                onChange={(e) => handleAssignRoom(room.id, e.target.value)}
                                style={{
                                  padding: '0.375rem 0.625rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  borderColor: isAssigned ? '#0ea5e9' : '#ea580c',
                                  color: isAssigned ? 'var(--text-color)' : '#c2410c',
                                  minWidth: '220px',
                                }}
                              >
                                <option value="UNASSIGN">🟢 Unassigned (Available Space)</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    🔒 {d.name} ({d.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ================= FIXED FOOTER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            All space assignments update Campus Infrastructure and department capacity in real-time.
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Done & Return to Departments
          </button>
        </div>
      </div>
    </div>
  );
};
