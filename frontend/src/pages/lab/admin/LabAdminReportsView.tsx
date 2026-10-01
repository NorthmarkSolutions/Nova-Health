import React, { useState } from 'react';

interface LabAdminReportsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const LabAdminReportsView: React.FC<LabAdminReportsViewProps> = () => {
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'quarter'>('30d');
  const [hoveredBar, setHoveredBar] = useState<{ day: number; count: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 30 days daily order volume heights matching mockup
  const dailyData = [
    { day: 1, height: '69.3%', count: 312, weekend: false },
    { day: 2, height: '75.6%', count: 340, weekend: false },
    { day: 3, height: '66.2%', count: 298, weekend: false },
    { day: 4, height: '78.9%', count: 355, weekend: false },
    { day: 5, height: '82.7%', count: 372, weekend: false },
    { day: 6, height: '42.2%', count: 190, weekend: true },
    { day: 7, height: '35.6%', count: 160, weekend: true },
    { day: 8, height: '73.3%', count: 330, weekend: false },
    { day: 9, height: '80.2%', count: 361, weekend: false },
    { day: 10, height: '76.4%', count: 344, weekend: false },
    { day: 11, height: '84.4%', count: 380, weekend: false },
    { day: 12, height: '87.8%', count: 395, weekend: false },
    { day: 13, height: '45.6%', count: 205, weekend: true },
    { day: 14, height: '37.8%', count: 170, weekend: true },
    { day: 15, height: '77.3%', count: 348, weekend: false },
    { day: 16, height: '81.3%', count: 366, weekend: false },
    { day: 17, height: '78.2%', count: 352, weekend: false },
    { day: 18, height: '86.4%', count: 389, weekend: false },
    { day: 19, height: '89.1%', count: 401, weekend: false },
    { day: 20, height: '47.6%', count: 214, weekend: true },
    { day: 21, height: '39.1%', count: 176, weekend: true },
    { day: 22, height: '82.4%', count: 371, weekend: false },
    { day: 23, height: '87.1%', count: 392, weekend: false },
    { day: 24, height: '80.0%', count: 360, weekend: false },
    { day: 25, height: '88.4%', count: 398, weekend: false },
    { day: 26, height: '91.1%', count: 410, weekend: false },
    { day: 27, height: '48.9%', count: 220, weekend: true },
    { day: 28, height: '40.2%', count: 181, weekend: true },
    { day: 29, height: '89.3%', count: 402, weekend: false },
    { day: 30, height: '91.6%', count: 412, weekend: false, isToday: true },
  ];

  const handleExport = () => {
    triggerToast(`Exporting ${timeframe.toUpperCase()} Analytics Package (CSV + PDF summary)`);
  };

  const handleDownloadSavedReport = (title: string) => {
    triggerToast(`Downloading: ${title} (.PDF)`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#111827',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
            Reports &amp; Analytics
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Department performance over time: volume, turnaround, quality and revenue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Timeframe Segmented Control */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '3px',
              borderRadius: '10px',
              background: '#F3F4F6',
              height: '40px',
              alignItems: 'center',
            }}
          >
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 days' },
              { id: '30d', label: '30 days' },
              { id: 'quarter', label: 'Quarter' },
            ].map((t) => {
              const isActive = timeframe === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id as any)}
                  style={{
                    whiteSpace: 'nowrap',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? '#FFFFFF' : 'transparent',
                    boxShadow: isActive ? '0 1px 2px rgba(17,24,39,0.08)' : 'none',
                    color: isActive ? '#111827' : '#6B7280',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleExport}
            style={{
              whiteSpace: 'nowrap',
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #2563EB',
              background: '#2563EB',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Export
          </button>
        </div>
      </header>

      {/* 5 KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        {/* Card 1 */}
        <div
          style={{
            background: '#FFFFFF',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Orders</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#F0FDF4',
                color: '#15803D',
              }}
            >
              +7.8%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>11,284</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>1–30 Sep · vs Aug</span>
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: '#FFFFFF',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Revenue</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#F0FDF4',
                color: '#15803D',
              }}
            >
              +5.2%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>Rs. 68.9L</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>lab tests only</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: '#FFFFFF',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Median turnaround</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#F0FDF4',
                color: '#15803D',
              }}
            >
              −6m
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>48m</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>order → sign-off</span>
          </div>
        </div>

        {/* Card 4 */}
        <div
          style={{
            background: '#FFFFFF',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Critical call-back</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#F0FDF4',
                color: '#15803D',
              }}
            >
              Target 15m
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>7m</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>median · 31 criticals</span>
          </div>
        </div>

        {/* Card 5 */}
        <div
          style={{
            background: '#FFFFFF',
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
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Re-test rate</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#FFFBEB',
                color: '#B45309',
              }}
            >
              +0.3 pts
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B45309' }}>2.3%</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>259 orders</span>
          </div>
        </div>
      </section>

      {/* Middle Section: Daily Volume Chart & Referring Dept Breakdown */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        {/* Daily Order Volume Bar Chart */}
        <div
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Daily order volume</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Last 30 days · weekends lighter</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Peak 412 · today</span>
              {hoveredBar && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D4ED8' }}>
                  {hoveredBar.day} Sep: {hoveredBar.count} orders
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', height: '200px' }}>
            {/* Y-Axis Labels */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#9CA3AF',
                paddingBottom: '22px',
                textAlign: 'right',
                width: '26px',
              }}
            >
              <span>450</span>
              <span>300</span>
              <span>150</span>
              <span>0</span>
            </div>

            {/* Bars & X-Axis */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(30, minmax(0, 1fr))',
                  gap: '4px',
                  alignItems: 'end',
                  borderBottom: '1px solid #E5E7EB',
                  borderLeft: '1px solid #F3F4F6',
                  paddingLeft: '4px',
                }}
              >
                {dailyData.map((bar) => {
                  const barBg = bar.isToday ? '#1D4ED8' : bar.weekend ? '#BFDBFE' : '#2563EB';
                  return (
                    <div
                      key={bar.day}
                      onMouseEnter={() => setHoveredBar({ day: bar.day, count: bar.count })}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{
                        height: bar.height,
                        borderRadius: '3px 3px 0 0',
                        background: barBg,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                        opacity: hoveredBar && hoveredBar.day !== bar.day ? 0.6 : 1,
                      }}
                      title={`${bar.day} Sep: ${bar.count} orders`}
                    />
                  );
                })}
              </div>

              {/* X-Axis Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#6B7280',
                  paddingLeft: '4px',
                }}
              >
                <span>1 Sep</span>
                <span>8 Sep</span>
                <span>15 Sep</span>
                <span>22 Sep</span>
                <span>30 Sep</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders by Referring Department */}
        <div
          style={{
            flex: '1 1 340px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Orders by referring department
              </h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Last 30 days</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* OPD */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>OPD</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>6,120</span>
            </div>

            {/* IPD & wards */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>IPD &amp; wards</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '39.4%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>2,410</span>
            </div>

            {/* Emergency */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>Emergency</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '22.5%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>1,380</span>
            </div>

            {/* ICU */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>ICU</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '11.8%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>720</span>
            </div>

            {/* OT / pre-op */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>OT / pre-op</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '6.7%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>410</span>
            </div>

            {/* Health packages */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 52px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>Health packages</span>
              <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '4.0%', borderRadius: '4px', background: '#2563EB' }} />
              </div>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>244</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Top Tests & Within TAT Target / Saved Reports */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        {/* Top Tests Table */}
        <div
          style={{
            flex: '999 1 520px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Top tests</h2>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>By volume · last 30 days</span>
              </div>
              <button
                onClick={() => triggerToast('Viewing all 89 tests sorted by volume')}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                All tests →
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '520px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.5fr) 80px 96px 92px',
                  gap: '12px',
                  alignItems: 'center',
                  height: '44px',
                  padding: '0 20px',
                  background: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.02em',
                }}
              >
                <span>TEST</span>
                <span style={{ textAlign: 'right' }}>ORDERS</span>
                <span style={{ textAlign: 'right' }}>REVENUE</span>
                <span style={{ textAlign: 'right' }}>MEDIAN TAT</span>
              </div>

              {/* Rows */}
              {[
                { name: 'Complete blood count', section: 'Hematology', orders: '2,948', rev: 'Rs. 10.3L', tat: '41m', tatType: 'green' },
                { name: 'Renal function panel', section: 'Biochemistry', orders: '1,612', rev: 'Rs. 10.5L', tat: '52m', tatType: 'green' },
                { name: 'Liver function test', section: 'Biochemistry', orders: '1,204', rev: 'Rs. 8.4L', tat: '55m', tatType: 'green' },
                { name: 'Serum electrolytes', section: 'Biochemistry', orders: '1,090', rev: 'Rs. 4.4L', tat: '38m', tatType: 'green' },
                { name: 'Thyroid profile', section: 'Immunoassay', orders: '886', rev: 'Rs. 6.6L', tat: '2h 10m', tatType: 'amber' },
                { name: 'HbA1c', section: 'Biochemistry', orders: '742', rev: 'Rs. 3.6L', tat: '7h 40m', tatType: 'red' },
              ].map((test, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1.5fr) 80px 96px 92px',
                    gap: '12px',
                    alignItems: 'center',
                    minHeight: '56px',
                    padding: '8px 20px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{test.name}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{test.section}</span>
                  </div>

                  <span style={{ fontSize: '14px', color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {test.orders}
                  </span>

                  <span style={{ fontSize: '14px', color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {test.rev}
                  </span>

                  <span style={{ justifySelf: 'end' }}>
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background:
                          test.tatType === 'green' ? '#F0FDF4' : test.tatType === 'amber' ? '#FFFBEB' : '#FEF2F2',
                        color:
                          test.tatType === 'green' ? '#15803D' : test.tatType === 'amber' ? '#B45309' : '#B91C1C',
                      }}
                    >
                      {test.tat}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: '4px' }} />
        </div>

        {/* Right Column: TAT Target breakdown + Saved Reports */}
        <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Within TAT target */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Within TAT target</h3>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Share of reports on time</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Hematology */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>Hematology</span>
                  <b style={{ color: '#111827' }}>94%</b>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '94%', borderRadius: '4px', background: '#16A34A' }} />
                </div>
              </div>

              {/* Biochemistry */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>Biochemistry</span>
                  <b style={{ color: '#111827' }}>91%</b>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '91%', borderRadius: '4px', background: '#16A34A' }} />
                </div>
              </div>

              {/* Immunoassay */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>Immunoassay</span>
                  <b style={{ color: '#B45309' }}>88%</b>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '88%', borderRadius: '4px', background: '#F59E0B' }} />
                </div>
              </div>

              {/* STAT orders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>STAT orders</span>
                  <b style={{ color: '#B45309' }}>82%</b>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '82%', borderRadius: '4px', background: '#F59E0B' }} />
                </div>
              </div>

              {/* HbA1c */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>HbA1c</span>
                  <b style={{ color: '#B91C1C' }}>61%</b>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '61%', borderRadius: '4px', background: '#DC2626' }} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#FFFBEB',
                fontSize: '13px',
                marginTop: '4px',
              }}
            >
              <span style={{ color: '#B45309' }}>HbA1c dropped due to D-10 downtime (4 days)</span>
            </div>
          </div>

          {/* Card 2: Saved reports */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Saved reports</h3>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Scheduled and on-demand</span>
              </div>
            </div>

            {[
              { title: 'Monthly TAT compliance', sub: 'PDF · auto-sent 1st of month' },
              { title: 'Critical value log', sub: 'Required for NABL audit' },
              { title: 'QC summary (Westgard)', sub: 'By analyzer and level' },
              { title: 'Revenue by test', sub: 'Shared with Finance Manager' },
              { title: 'Re-test and rejection report', sub: 'By technician and reason' },
            ].map((rep, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '52px',
                  borderBottom: idx < 4 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{rep.title}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{rep.sub}</span>
                </div>
                <button
                  onClick={() => handleDownloadSavedReport(rep.title)}
                  style={{
                    whiteSpace: 'nowrap',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    cursor: 'pointer',
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LabAdminReportsView;
