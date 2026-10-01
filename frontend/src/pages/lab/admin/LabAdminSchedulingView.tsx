import React, { useState } from 'react';
import { PageHeader } from '../../../components/shared';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  onNavigateTab: (tab: string) => void;
}

interface RosterShiftCell {
  code: 'D' | 'M' | 'E' | 'N' | 'Leave' | 'Off' | 'On call' | 'Gap';
  hours?: string;
}

interface StaffScheduleRow {
  name: string;
  role: string;
  shifts: RosterShiftCell[];
}

export const LabAdminSchedulingView: React.FC<Props> = ({ onNavigateTab }) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [coveragePercent, setCoveragePercent] = useState(96);
  const [unfilledGapsCount, setUnfilledGapsCount] = useState(2);
  const [isPublished, setIsPublished] = useState(false);

  const [rosterRows, setRosterRows] = useState<StaffScheduleRow[]>([
    {
      name: 'Dr. Kavitha Menon',
      role: 'Pathologist',
      shifts: [
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
        { code: 'Off' },
        { code: 'On call' },
      ],
    },
    {
      name: 'Dr. Sanjay Rao',
      role: 'Pathologist',
      shifts: [
        { code: 'On call' },
        { code: 'On call' },
        { code: 'Off' },
        { code: 'Off' },
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
        { code: 'D', hours: '08–16' },
      ],
    },
    {
      name: 'Anjali Verma',
      role: 'Technologist',
      shifts: [
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'Off' },
        { code: 'Off' },
      ],
    },
    {
      name: 'Vikram Rao',
      role: 'Technologist',
      shifts: [
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'Leave' },
        { code: 'Leave' },
        { code: 'Off' },
        { code: 'M', hours: '07–15' },
      ],
    },
    {
      name: 'Pooja Sharma',
      role: 'Technologist',
      shifts: [
        { code: 'E', hours: '15–23' },
        { code: 'E', hours: '15–23' },
        { code: 'E', hours: '15–23' },
        { code: 'E', hours: '15–23' },
        { code: 'M', hours: '07–15' },
        { code: 'Off' },
        { code: 'E', hours: '15–23' },
      ],
    },
    {
      name: 'Imran Shaikh',
      role: 'Technologist',
      shifts: [
        { code: 'N', hours: '23–07' },
        { code: 'N', hours: '23–07' },
        { code: 'N', hours: '23–07' },
        { code: 'E', hours: '15–23' },
        { code: 'N', hours: '23–07' },
        { code: 'Off' },
        { code: 'Off' },
      ],
    },
    {
      name: 'Ritu Das',
      role: 'Technologist',
      shifts: [
        { code: 'Leave' },
        { code: 'Leave' },
        { code: 'Leave' },
        { code: 'Leave' },
        { code: 'Off' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
      ],
    },
    {
      name: 'Neha Pillai',
      role: 'Phlebotomist',
      shifts: [
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'Off' },
      ],
    },
    {
      name: 'Arjun Kapoor',
      role: 'Phlebotomist',
      shifts: [
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'Off' },
        { code: 'M', hours: '07–15' },
        { code: 'M', hours: '07–15' },
        { code: 'E', hours: '15–23' },
        { code: 'E', hours: '15–23' },
      ],
    },
    {
      name: 'Night cover',
      role: 'Unassigned',
      shifts: [
        { code: 'Off' },
        { code: 'Off' },
        { code: 'Off' },
        { code: 'Off' },
        { code: 'Gap' },
        { code: 'Gap' },
        { code: 'Off' },
      ],
    },
  ]);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAssignGap = (dayIdx: number, staffName: string) => {
    setRosterRows((prev) =>
      prev.map((row) => {
        if (row.name === 'Night cover') {
          const nextShifts = [...row.shifts];
          nextShifts[dayIdx] = { code: 'N', hours: '23–07' };
          return { ...row, shifts: nextShifts };
        }
        return row;
      })
    );
    setUnfilledGapsCount((c) => Math.max(0, c - 1));
    setCoveragePercent(98);
    showNotice(`Assigned ${staffName} to Night shift on ${dayIdx === 4 ? 'Fri 3' : 'Sat 4'}. Gap filled.`);
  };

  const handlePublishRoster = () => {
    setIsPublished(true);
    showNotice('Weekly duty roster published! Shift alerts sent to 14 lab personnel.');
  };

  const renderCellBadge = (shift: RosterShiftCell) => {
    switch (shift.code) {
      case 'D':
      case 'M':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D4ED8' }}>{shift.code}</span>
            <span style={{ fontSize: '11px', color: '#1D4ED8', opacity: 0.8 }}>{shift.hours}</span>
          </div>
        );
      case 'E':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#E0F2FE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>E</span>
            <span style={{ fontSize: '11px', color: '#0369A1', opacity: 0.8 }}>{shift.hours}</span>
          </div>
        );
      case 'N':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#1F2937', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>N</span>
            <span style={{ fontSize: '11px', color: '#FFFFFF', opacity: 0.8 }}>{shift.hours}</span>
          </div>
        );
      case 'Leave':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#FFFBEB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#B45309' }}>Leave</span>
          </div>
        );
      case 'On call':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px dashed #D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>On call</span>
          </div>
        );
      case 'Gap':
        return (
          <div style={{ height: '44px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#B91C1C' }}>Gap</span>
          </div>
        );
      default:
        return (
          <div style={{ height: '44px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF' }}>Off</span>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Duty Scheduling"
        description="Weekly roster for the lab. Publishing notifies each staff member and updates their shift on the workspace."
      >
        <button
          type="button"
          onClick={() => showNotice('Copied previous week schedule template.')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Copy last week
        </button>
        <button
          type="button"
          onClick={() => showNotice('Schedule draft saved to local storage.')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={handlePublishRoster}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #2563EB',
            backgroundColor: '#2563EB',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {isPublished ? 'Roster Published ✓' : 'Publish roster'}
        </button>
      </PageHeader>

      {/* 4 KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Shift coverage</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
              {coveragePercent}%
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>this week · 68 of 71 slots</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Unfilled shifts</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
              Fix
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B91C1C' }}>
              {unfilledGapsCount}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Night · Fri 3, Sat 4</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Pending changes</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#FFFBEB', color: '#B45309' }}>
              Review
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B45309' }}>2</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>leave + shift swap</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Overtime</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>14 h</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>across 3 staff</span>
          </div>
        </div>
      </section>

      {/* Main Split Layout: Roster Matrix (left) + Side Rules (right) */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left Roster Card */}
        <div
          style={{
            flex: '999 1 700px',
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Week of 29 Sep – 5 Oct 2026</h2>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  {isPublished ? 'Published · live for department' : 'Draft · last edited 09:40 by you'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    whiteSpace: 'nowrap',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    cursor: 'pointer',
                  }}
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  style={{
                    whiteSpace: 'nowrap',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    cursor: 'pointer',
                  }}
                >
                  This week
                </button>
                <button
                  type="button"
                  style={{
                    whiteSpace: 'nowrap',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    cursor: 'pointer',
                  }}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Grid */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '760px', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(170px,1.4fr) repeat(7, minmax(64px,1fr))',
                  gap: '6px',
                  alignItems: 'center',
                  height: '44px',
                  padding: '0 20px',
                  backgroundColor: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                }}
              >
                <span>STAFF</span>
                <span style={{ textAlign: 'center' }}>MON 29</span>
                <span style={{ textAlign: 'center', color: '#1D4ED8' }}>TUE 30</span>
                <span style={{ textAlign: 'center' }}>WED 1</span>
                <span style={{ textAlign: 'center' }}>THU 2</span>
                <span style={{ textAlign: 'center' }}>FRI 3</span>
                <span style={{ textAlign: 'center' }}>SAT 4</span>
                <span style={{ textAlign: 'center' }}>SUN 5</span>
              </div>

              {/* Rows */}
              {rosterRows.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(170px,1.4fr) repeat(7, minmax(64px,1fr))',
                    gap: '6px',
                    alignItems: 'center',
                    minHeight: '60px',
                    padding: '8px 20px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{row.name}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{row.role}</span>
                  </div>

                  {row.shifts.map((s, idx) => (
                    <div key={idx}>{renderCellBadge(s)}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#374151', padding: '0 20px 16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#EFF6FF', border: '1px solid #E5E7EB' }} />
              Morning 07–15
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#EFF6FF', border: '1px solid #E5E7EB' }} />
              Day 08–16
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#E0F2FE', border: '1px solid #E5E7EB' }} />
              Evening 15–23
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#1F2937', border: '1px solid #E5E7EB' }} />
              Night 23–07
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#FFFBEB', border: '1px solid #E5E7EB' }} />
              Leave
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }} />
              Unfilled
            </span>
          </div>
        </div>

        {/* Right Stack: Coverage Rules + Fill Gaps */}
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Coverage Rules */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Coverage rules</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Checked against the draft</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Pathologist on call 24×7</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Met every day</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#15803D' }}>
                Met
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Min. 2 technologists per shift</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Night Fri 3 and Sat 4 short by 1</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                {unfilledGapsCount > 0 ? `${unfilledGapsCount} gaps` : 'Met'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>1 phlebotomist per ward round</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Met every day</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#15803D' }}>
                Met
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Max 6 consecutive shifts</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Neha Pillai at 6 · Sun off</span>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#B45309' }}>
                At limit
              </span>
            </div>
          </div>

          {/* Fill Gaps */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Fill gaps</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Suggested by availability and hours</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #FECACA', borderRadius: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Fri 3 · Night 23–07</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Imran Shaikh (off) · 38 h this week</span>
              </div>
              <button
                type="button"
                onClick={() => handleAssignGap(4, 'Imran Shaikh')}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #2563EB',
                  backgroundColor: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Assign
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #FECACA', borderRadius: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Sat 4 · Night 23–07</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Pooja Sharma (off) · 36 h this week</span>
              </div>
              <button
                type="button"
                onClick={() => handleAssignGap(5, 'Pooja Sharma')}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #2563EB',
                  backgroundColor: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
