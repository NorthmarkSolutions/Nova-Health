import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar, Users, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Clock, ShieldCheck, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { billingService, StaffRosterData, StaffRosterEntry } from '../../../services/billingService';
import { Btn, C, Callout, Empty, PageHeader, card, mono, inputStyle, apiError } from '../executive/executiveUi';

const SHIFT_TYPES = [
  { value: 'MORNING', label: 'Morning (08:00 - 16:00)', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'EVENING', label: 'Evening (16:00 - 00:00)', color: '#D97706', bg: '#FFFBEB' },
  { value: 'NIGHT', label: 'Night (00:00 - 08:00)', color: '#4F46E5', bg: '#EEF2FF' },
];

export const StaffRosterScreen: React.FC = () => {
  const [data, setData] = useState<StaffRosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>('MORNING');
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Local assignments map: key = `${counterId}_${date}_${shift}` -> staffId
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadRoster = useCallback(async (weekStart?: string) => {
    try {
      setError(null);
      setNotice(null);
      const res = await billingService.getAdminStaffRoster({
        week_start: weekStart || undefined,
        shift_type: selectedShift || undefined
      });
      setData(res);
      setCurrentWeekStart(res.week_start);

      // Populate local assignment map
      const map: Record<string, string> = {};
      (res.roster || []).forEach((r) => {
        map[`${r.counter_id}_${r.roster_date}_${r.shift_type}`] = r.staff_id;
      });
      setAssignmentMap(map);
      setHasChanges(false);
    } catch (err) {
      setError(apiError(err, 'Failed to load staff roster.'));
    } finally {
      setLoading(false);
    }
  }, [selectedShift]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const handlePrevWeek = () => {
    if (!currentWeekStart) return;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    const prev = d.toISOString().slice(0, 10);
    setCurrentWeekStart(prev);
    loadRoster(prev);
  };

  const handleNextWeek = () => {
    if (!currentWeekStart) return;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().slice(0, 10);
    setCurrentWeekStart(next);
    loadRoster(next);
  };

  const handleSelectCashier = (counterId: string, date: string, shift: string, staffId: string) => {
    const key = `${counterId}_${date}_${shift}`;
    if (!staffId) {
      const next = { ...assignmentMap };
      delete next[key];
      setAssignmentMap(next);
      setHasChanges(true);
      return;
    }

    // Check conflict: Is this staff already assigned to another counter on the same date and shift?
    const conflict = Object.entries(assignmentMap).find(
      ([k, sid]) => sid === staffId && k.endsWith(`_${date}_${shift}`) && !k.startsWith(`${counterId}_`)
    );

    if (conflict) {
      const [conflictKey] = conflict;
      const conflictCounterId = conflictKey.split('_')[0];
      const conflictCounter = data?.counters.find((c) => c.id === conflictCounterId);
      const staffMember = data?.staff.find((s) => s.id === staffId);
      setError(
        `Roster conflict: ${staffMember?.name || 'Staff'} is already scheduled on ${conflictCounter?.code || 'another counter'} for ${date} (${shift} shift)!`
      );
      return;
    }

    setError(null);
    setAssignmentMap((prev) => ({
      ...prev,
      [key]: staffId
    }));
    setHasChanges(true);
  };

  const handleSaveRoster = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const assignments = Object.entries(assignmentMap).map(([key, staffId]) => {
        const [counterId, date, shift] = key.split('_');
        return {
          counter_id: counterId,
          staff_id: staffId,
          roster_date: date,
          shift_type: shift,
          notes: ''
        };
      });

      if (assignments.length === 0) {
        setNotice('No shifts scheduled to save.');
        setSaving(false);
        return;
      }

      await billingService.assignAdminStaffRoster(assignments);
      setNotice('Duty roster saved successfully.');
      setHasChanges(false);
      loadRoster(currentWeekStart);
    } catch (err) {
      setError(apiError(err, 'Failed to save roster.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublishRoster = async () => {
    setPublishing(true);
    setError(null);
    try {
      // Save changes first if any
      if (hasChanges) {
        await handleSaveRoster();
      }
      const res = await billingService.publishAdminStaffRoster(currentWeekStart);
      setNotice(`Roster published! ${res.count} shift assignments unlocked for workstation login.`);
      loadRoster(currentWeekStart);
    } catch (err) {
      setError(apiError(err, 'Failed to publish roster.'));
    } finally {
      setPublishing(false);
    }
  };

  const totalSlots = (data?.counters?.length || 0) * (data?.week_dates?.length || 0);
  const scheduledCount = Object.keys(assignmentMap).filter((k) => k.endsWith(`_${selectedShift}`)).length;
  const uniqueCashiers = new Set(Object.values(assignmentMap)).size;

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Staff & Shift Scheduling"
        subtitle="Weekly duty roster for billing cashiers, counter station allocations and workstation security clearance"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {data?.is_published ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green, background: C.greenSoft, padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> PUBLISHED
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, background: C.amberSoft, padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> DRAFT ROSTER
              </span>
            )}
            <Btn variant="secondary" onClick={handleSaveRoster} disabled={saving || !hasChanges}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Btn>
            <Btn variant="primary" onClick={handlePublishRoster} disabled={publishing}>
              <Send size={14} style={{ marginRight: 6 }} />
              {publishing ? 'Publishing...' : 'Publish Roster'}
            </Btn>
          </div>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}
      {notice && <Callout tone="green">{notice}</Callout>}

      {/* Roster Controls: Week Navigation & Shift Type selector */}
      <div style={{ ...card, padding: 16, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePrevWeek}
            style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
            title="Previous Week"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.text }}>
            <Calendar size={16} color={C.primary} />
            <span>
              {data?.week_start ? `${data.week_start} to ${data.week_end}` : 'Current Week'}
            </span>
          </div>
          <button
            onClick={handleNextWeek}
            style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
            title="Next Week"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Shift selector pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {SHIFT_TYPES.map((st) => (
            <button
              key={st.value}
              onClick={() => setSelectedShift(st.value)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                cursor: 'pointer',
                border: `1px solid ${selectedShift === st.value ? st.color : C.border}`,
                background: selectedShift === st.value ? st.bg : C.surface,
                color: selectedShift === st.value ? st.color : C.textSub,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Clock size={12} />
              {st.label}
            </button>
          ))}
        </div>

        {/* Stats summary */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.muted }}>
          <span>Slots Filled: <strong style={{ color: C.text, ...mono }}>{scheduledCount} / {totalSlots}</strong></span>
          <span>Cashiers Deployed: <strong style={{ color: C.primary, ...mono }}>{uniqueCashiers}</strong></span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <RefreshCw size={24} className="animate-spin" color={C.primary} />
        </div>
      ) : (
        /* 7-Day Visual Grid */
        <div style={{ ...card, overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: C.text, minWidth: 160 }}>
                  Station / Counter
                </th>
                {(data?.week_dates || []).map((dateStr) => {
                  const d = new Date(dateStr);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = new Date().toISOString().slice(0, 10) === dateStr;
                  return (
                    <th
                      key={dateStr}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: isToday ? C.primary : C.textSub,
                        background: isToday ? C.primarySoft : undefined,
                        minWidth: 140,
                        borderLeft: `1px solid ${C.border}`
                      }}
                    >
                      <div>{dayName}</div>
                      <div style={{ fontSize: 11, color: isToday ? C.primary : C.muted, fontWeight: 500, ...mono }}>
                        {dateStr.slice(5)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(data?.counters || []).map((counter) => (
                <tr key={counter.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top', background: C.bg }}>
                    <div style={{ fontWeight: 700, color: C.text, ...mono }}>{counter.code}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{counter.name}</div>
                    <div style={{ fontSize: 10, color: C.faint }}>{counter.location}</div>
                  </td>

                  {(data?.week_dates || []).map((dateStr) => {
                    const key = `${counter.id}_${dateStr}_${selectedShift}`;
                    const assignedStaffId = assignmentMap[key] || '';
                    const assignedStaff = data?.staff.find((s) => s.id === assignedStaffId);

                    return (
                      <td
                        key={dateStr}
                        style={{
                          padding: 8,
                          verticalAlign: 'top',
                          borderLeft: `1px solid ${C.border}`,
                          background: assignedStaffId ? '#FAF5FF' : C.surface
                        }}
                      >
                        <select
                          value={assignedStaffId}
                          onChange={(e) => handleSelectCashier(counter.id, dateStr, selectedShift, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: `1px solid ${assignedStaffId ? '#C084FC' : C.border}`,
                            background: assignedStaffId ? '#FFFFFF' : '#F9FAFB',
                            color: assignedStaffId ? C.text : C.muted,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">— Unassigned —</option>
                          {(data?.staff || []).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role})
                            </option>
                          ))}
                        </select>

                        {assignedStaff && (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7E22CE' }}>
                            <ShieldCheck size={11} /> {assignedStaff.role}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roster Guide Callout */}
      <div style={{ marginTop: 20, padding: 14, background: C.primarySoft, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={18} color={C.primaryDark} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: C.primaryDark, lineHeight: 1.5 }}>
          <strong>Workstation Clearance Policy:</strong> Publishing the duty roster activates cashier terminal sign-in privileges.
          Cashiers can only open shifts on counters and dates where their schedule is published.
          The roster engine automatically prevents double-booking cashiers across concurrent stations.
        </div>
      </div>
    </div>
  );
};
