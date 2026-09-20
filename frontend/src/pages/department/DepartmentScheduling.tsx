import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  DoorClosed,
  Plus,
  Filter,
  CheckCircle2,
  Stethoscope,
  Activity,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Check,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentScheduleSlot, DepartmentShift } from '../../types';
import {
  getDepartmentSchedules,
  saveDepartmentSchedule,
  getDepartmentStaffAssignments,
  getDepartmentRooms,
  getDepartmentShifts,
  saveDepartmentShift,
} from './departmentWorkspaceStore';
import {
  getHospitalStaff,
  updateHospitalStaff,
  StaffMember,
} from '../admin/setup/organization/hospitalStaffStore';

interface Props {
  workspace: DepartmentWorkspace;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DepartmentScheduling: React.FC<Props> = ({ workspace }) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'calendar'>('shifts');

  // Shifts state
  const [shifts, setShifts] = useState<DepartmentShift[]>(() =>
    getDepartmentShifts(workspace.departmentId)
  );

  // Schedules state
  const [schedules, setSchedules] = useState<DepartmentScheduleSlot[]>(() =>
    getDepartmentSchedules(workspace.departmentId)
  );
  const [staffAssignments, setStaffAssignments] = useState(() =>
    getDepartmentStaffAssignments(workspace.departmentId)
  );
  const [hospitalStaffPool, setHospitalStaffPool] = useState<StaffMember[]>(() =>
    getHospitalStaff()
  );
  const [rooms, setRooms] = useState(() =>
    getDepartmentRooms(workspace.departmentId)
  );

  // Calendar filter state
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');

  // Custom shift modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('08:00');
  const [newShiftEnd, setNewShiftEnd] = useState('16:00');
  const [newShiftType, setNewShiftType] = useState<'morning' | 'evening' | 'night' | 'general'>('morning');

  const reload = () => {
    setShifts(getDepartmentShifts(workspace.departmentId));
    setSchedules(getDepartmentSchedules(workspace.departmentId));
    setStaffAssignments(getDepartmentStaffAssignments(workspace.departmentId));
    setHospitalStaffPool(getHospitalStaff());
    setRooms(getDepartmentRooms(workspace.departmentId));
  };

  useEffect(() => {
    reload();
  }, [workspace.departmentId]);

  // Department staff members from hospital pool
  const deptStaffMembers = useMemo(() => {
    return hospitalStaffPool.filter((s) => {
      const inDeptIds = s.departmentIds && s.departmentIds.includes(workspace.departmentId);
      const inDeptId = s.departmentId === workspace.departmentId;
      const inDeptNames = s.departmentNames && s.departmentNames.some((n) => n.toLowerCase().includes(workspace.shortName.toLowerCase()));
      const matchesAssignment = staffAssignments.some((sa) => sa.staffId === s.id);
      return inDeptIds || inDeptId || inDeptNames || matchesAssignment;
    });
  }, [hospitalStaffPool, workspace, staffAssignments]);

  // Toggle shift for a staff member (supports multi-shift e.g. Nurse Priya -> Morning + Evening)
  const handleToggleStaffShift = (staffId: string, shift: DepartmentShift) => {
    const member = hospitalStaffPool.find((s) => s.id === staffId);
    if (!member) return;

    const currentShiftIds = member.shiftIds || (member.shiftId ? [member.shiftId] : []);
    const currentShiftNames = member.shiftNames || (member.shiftName ? [member.shiftName] : []);
    const currentHours = member.shiftHoursList || (member.shiftHours ? [member.shiftHours] : []);

    const hasShift = currentShiftIds.includes(shift.id);

    let updatedIds: string[];
    let updatedNames: string[];
    let updatedHours: string[];

    if (hasShift) {
      // Don't allow deselecting if it's the only shift
      if (currentShiftIds.length <= 1) {
        alert('Staff member must have at least one assigned shift window.');
        return;
      }
      updatedIds = currentShiftIds.filter((id) => id !== shift.id);
      updatedNames = currentShiftNames.filter((name) => !name.toLowerCase().includes(shift.name.toLowerCase()));
      updatedHours = currentHours.filter((h) => !h.includes(shift.startTime));
    } else {
      updatedIds = [...currentShiftIds, shift.id];
      updatedNames = [...currentShiftNames, shift.name];
      updatedHours = [...currentHours, `${shift.startTime} - ${shift.endTime}`];
    }

    const updatedMember: StaffMember = {
      ...member,
      shiftIds: updatedIds,
      shiftNames: updatedNames,
      shiftHoursList: updatedHours,
      shiftId: updatedIds[0],
      shiftName: updatedNames[0],
      shiftHours: updatedHours[0],
    };

    updateHospitalStaff(updatedMember);
    reload();
  };

  // Quick preset helper to apply the exact Step 4 instructions
  const handleApplyPreset = (staffNameKeyword: string, shiftTypes: string[]) => {
    const target = deptStaffMembers.find((s) =>
      s.fullName.toLowerCase().includes(staffNameKeyword.toLowerCase())
    );
    if (!target) return;

    const matchedShifts = shifts.filter((sh) =>
      shiftTypes.some((t) => sh.type === t || sh.name.toLowerCase().includes(t.toLowerCase()))
    );

    if (matchedShifts.length === 0) return;

    const updatedMember: StaffMember = {
      ...target,
      shiftIds: matchedShifts.map((s) => s.id),
      shiftNames: matchedShifts.map((s) => s.name),
      shiftHoursList: matchedShifts.map((s) => `${s.startTime} - ${s.endTime}`),
      shiftId: matchedShifts[0].id,
      shiftName: matchedShifts[0].name,
      shiftHours: `${matchedShifts[0].startTime} - ${matchedShifts[0].endTime}`,
    };

    updateHospitalStaff(updatedMember);
    reload();
  };

  // Add custom shift
  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftName.trim()) return;

    const newShift: DepartmentShift = {
      id: `sh-${Date.now()}`,
      departmentId: workspace.departmentId,
      code: newShiftName.slice(0, 4).toUpperCase(),
      name: newShiftName.trim(),
      startTime: newShiftStart,
      endTime: newShiftEnd,
      duration: '8 hrs',
      type: newShiftType,
    };

    saveDepartmentShift(newShift);
    setIsShiftModalOpen(false);
    setNewShiftName('');
    reload();
  };

  const daySchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesDay = s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase();
      const matchesShift =
        selectedShiftFilter === 'all' ||
        s.shiftName.toLowerCase().includes(selectedShiftFilter.toLowerCase());
      return matchesDay && matchesShift;
    });
  }, [schedules, selectedDay, selectedShiftFilter]);

  const getShiftIcon = (type: string) => {
    switch (type) {
      case 'morning':
        return <Sun size={18} color="#d97706" />;
      case 'evening':
        return <Sunset size={18} color="#4f46e5" />;
      case 'night':
        return <Moon size={18} color="#0284c7" />;
      default:
        return <Clock size={18} color="#64748b" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Clock size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Shift Management & Duty Engine
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Step 4: Shift creation (Morning, Evening, Night) and multi-shift staff assignments for {workspace.departmentName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsShiftModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <Plus size={15} /> Add Custom Shift
          </button>
        </div>
      </div>

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'shifts' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'shifts' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} /> 1. Step 4: Shift Management & Allocation ({shifts.length} Shifts)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'calendar' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'calendar' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} /> 2. Weekly Duty Calendar & Chamber Rotations
        </button>
      </div>

      {activeTab === 'shifts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Defined Shifts Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {shifts.map((sh) => {
              const assignedCount = deptStaffMembers.filter((m) => {
                const sIds = m.shiftIds || [m.shiftId];
                const sNames = m.shiftNames || [m.shiftName];
                return sIds.includes(sh.id) || sNames.some((n) => n?.toLowerCase().includes(sh.name.toLowerCase()));
              }).length;

              const bgTheme =
                sh.type === 'morning'
                  ? { bg: '#fffbeb', border: '#fde68a', tag: '#b45309' }
                  : sh.type === 'evening'
                  ? { bg: '#eef2ff', border: '#c7d2fe', tag: '#4338ca' }
                  : { bg: '#f0f9ff', border: '#bae6fd', tag: '#0369a1' };

              return (
                <div
                  key={sh.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${bgTheme.border}`,
                    backgroundColor: bgTheme.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.5rem',
                          borderRadius: '10px',
                          display: 'flex',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        {getShiftIcon(sh.type)}
                      </span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          {sh.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: bgTheme.tag }}>
                          Code: {sh.code}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        color: bgTheme.tag,
                        border: `1px solid ${bgTheme.border}`,
                      }}
                    >
                      {sh.duration || '8 hrs'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px dashed ${bgTheme.border}`, paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      <Clock size={15} color={bgTheme.tag} />
                      <span>{sh.startTime} - {sh.endTime}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: bgTheme.tag }}>
                      {assignedCount} Staff Assigned
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Specification Banner / Step 4 Callout */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--secondary)', fontSize: '0.875rem' }}>
                <Sparkles size={16} color="#0284c7" />
                <span>Quick Scenario Presets (from Department Workflow Specification)</span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.7813rem', color: 'var(--text-muted)' }}>
                Click below to instantly apply the predefined shift rules (e.g., Nurse Priya assigned to both Morning + Evening).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleApplyPreset('Sarah', ['morning'])}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Dr. Sarah → Morning
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleApplyPreset('Michael', ['evening'])}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Dr. Michael → Evening
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleApplyPreset('Priya', ['morning', 'evening'])}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 700 }}
              >
                Nurse Priya → Morning + Evening
              </button>
            </div>
          </div>

          {/* Multi-Shift Staff Allocation Matrix */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Emp Code</th>
                  <th>Staff Personnel</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '220px' }}>Active Shift Coverage</th>
                  <th>Assign Shifts (Multi-Shift Supported)</th>
                </tr>
              </thead>
              <tbody>
                {deptStaffMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No staff stationed to {workspace.departmentName} yet.
                    </td>
                  </tr>
                ) : (
                  deptStaffMembers.map((member) => {
                    const memberShiftIds = member.shiftIds || (member.shiftId ? [member.shiftId] : []);
                    const memberShiftNames = member.shiftNames || (member.shiftName ? [member.shiftName] : []);

                    return (
                      <tr key={member.id}>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              fontFamily: 'monospace',
                            }}
                          >
                            {member.employeeCode}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{member.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.designation}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              member.role === 'doctor'
                                ? 'badge-primary'
                                : member.role === 'nurse'
                                ? 'badge-info'
                                : 'badge-secondary'
                            }`}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {memberShiftNames.map((sn, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#0369a1',
                                }}
                              >
                                <Clock size={12} color="#0284c7" />
                                <span>{sn}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {shifts.map((sh) => {
                              const isAssigned =
                                memberShiftIds.includes(sh.id) ||
                                memberShiftNames.some((sn) => sn.toLowerCase().includes(sh.name.toLowerCase()));

                              return (
                                <button
                                  key={sh.id}
                                  type="button"
                                  onClick={() => handleToggleStaffShift(member.id, sh)}
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: isAssigned ? 700 : 500,
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '8px',
                                    border: isAssigned ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                                    backgroundColor: isAssigned ? '#e0f2fe' : '#ffffff',
                                    color: isAssigned ? '#0369a1' : '#475569',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {isAssigned ? <Check size={13} color="#0284c7" /> : <Plus size={13} color="#94a3b8" />}
                                  <span>{sh.name}</span>
                                  <span style={{ fontSize: '0.6875rem', opacity: 0.75 }}>({sh.startTime})</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Day Selector Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const countForDay = schedules.filter((s) => s.dayOfWeek.toLowerCase() === day.toLowerCase()).length;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: isSelected ? '1.5px solid #0284c7' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#0369a1' : 'var(--text-color)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{day}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#0284c7' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                    }}
                  >
                    {countForDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Duty Slot Cards for Selected Day */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {daySchedules.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No duty slots scheduled for {selectedDay}. Staff are assigned dynamically based on shift patterns.
              </div>
            ) : (
              daySchedules.map((slot) => {
                const isDoc = slot.role === 'doctor';
                return (
                  <div
                    key={slot.id}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: isDoc ? '#eff6ff' : '#f0fdf4',
                          color: isDoc ? '#1d4ed8' : '#15803d',
                          border: isDoc ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                        }}
                      >
                        {slot.role.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                        <Clock size={12} color="#0284c7" />
                        <span>{slot.shiftName.split('(')[0].trim()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: isDoc ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: isDoc ? '#2563eb' : '#10b981',
                          fontWeight: 800,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {slot.staffName.replace('Dr. ', '').replace('Nurse ', '').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '0.95rem' }}>
                          {slot.staffName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Stationed: {slot.roomName || 'General Ward / Triage'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Custom Shift Modal */}
      {isShiftModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '500px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Clock size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  Create Custom Department Shift
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsShiftModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddShift} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Shift Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="form-input"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  placeholder="e.g. Afternoon Triage Shift"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Shift Type
                </label>
                <select
                  className="form-select"
                  value={newShiftType}
                  onChange={(e) => setNewShiftType(e.target.value as any)}
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsShiftModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
