import React, { useState } from 'react';

interface LabAdminSettingsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const LabAdminSettingsView: React.FC<LabAdminSettingsViewProps> = () => {
  const [activeAnchor, setActiveAnchor] = useState<string>('s2');

  // General Settings
  const [deptName, setDeptName] = useState('Diagnostic Lab');
  const [location, setLocation] = useState('Ground floor · Block C');
  const [hod, setHod] = useState('Dr. Kavitha Menon');
  const [intercom, setIntercom] = useState('2140');
  const [nablNo, setNablNo] = useState('MC-4418');

  // Operating Hours Toggles
  const [opdHoursActive, setOpdHoursActive] = useState(true);
  const [sundayHoursActive, setSundayHoursActive] = useState(true);
  const [statHoursActive, setStatHoursActive] = useState(true);
  const [homeCollectionActive, setHomeCollectionActive] = useState(true);

  // Workflow Rules
  const [batchSignoffEnabled, setBatchSignoffEnabled] = useState(true);
  const [autoFlagRanges, setAutoFlagRanges] = useState(true);
  const [retestRoute, setRetestRoute] = useState<'technician_queue' | 'technician_only' | 'general_queue'>('technician_queue');
  const [criticalAckWindow, setCriticalAckWindow] = useState('15 minutes');
  const [escalateTo, setEscalateTo] = useState('Department HOD, then Medical Superintendent');
  const [barcodeFormat, setBarcodeFormat] = useState('LAB-YYMM-#### · Code 128');
  const [rejectionReasons, setRejectionReasons] = useState('Haemolysed, clotted, QNS, mislabelled');

  // Notifications
  const [notifyIpdNurse, setNotifyIpdNurse] = useState(true);
  const [notifyDoctorAssistant, setNotifyDoctorAssistant] = useState(true);
  const [reportReadySms, setReportReadySms] = useState(false);

  // Reports & Printing
  const [reportTemplate, setReportTemplate] = useState('NABL standard · A4');
  const [digitalSignature, setDigitalSignature] = useState('Signing pathologist + HOD');
  const [showPreviousResult, setShowPreviousResult] = useState('Last 1 result with date');
  const [labelPrinter, setLabelPrinter] = useState('Zebra ZD421 · Bench 2');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveChanges = () => {
    triggerToast('Department configuration and workflow rules updated successfully');
  };

  const handleDiscard = () => {
    setDeptName('Diagnostic Lab');
    setLocation('Ground floor · Block C');
    setHod('Dr. Kavitha Menon');
    setIntercom('2140');
    setBatchSignoffEnabled(true);
    setAutoFlagRanges(true);
    setRetestRoute('technician_queue');
    triggerToast('Settings reverted to defaults');
  };

  const scrollToSection = (id: string) => {
    setActiveAnchor(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
            Department Settings
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            How the Diagnostic Lab runs: hours, workflow rules, alerts and reports. Changes apply to the Technician and Pathologist workspaces.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDiscard}
            style={{
              whiteSpace: 'nowrap',
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            Discard
          </button>
          <button
            onClick={handleSaveChanges}
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
            Save changes
          </button>
        </div>
      </header>

      {/* Two Column Layout: Anchor Menu & Settings Sections */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Sticky Anchor Navigation */}
        <div
          style={{
            flex: '0 1 220px',
            minWidth: '180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            position: 'sticky',
            top: '24px',
          }}
        >
          {[
            { id: 's0', label: 'General' },
            { id: 's1', label: 'Operating hours' },
            { id: 's2', label: 'Workflow rules' },
            { id: 's3', label: 'Notifications' },
            { id: 's4', label: 'Reports & printing' },
            { id: 's5', label: 'Integrations' },
          ].map((item) => {
            const isActive = activeAnchor === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1D4ED8' : '#374151',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right Settings Form Container */}
        <div style={{ flex: '1 1 560px', minWidth: 0, maxWidth: '880px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 0: General */}
          <div
            id="s0"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>General</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Shown on reports, labels and the department directory</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Department name</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Department code</label>
                <div
                  style={{
                    height: '40px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: '14px',
                    background: '#F9FAFB',
                    color: '#6B7280',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  LAB
                </div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Set by Hospital Admin</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Head of department</label>
                <select
                  value={hod}
                  onChange={(e) => setHod(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Dr. Kavitha Menon">Dr. Kavitha Menon</option>
                  <option value="Dr. Amanda Chen">Dr. Amanda Chen</option>
                  <option value="Dr. Rajesh Kumar">Dr. Rajesh Kumar</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Intercom extension</label>
                <input
                  type="text"
                  value={intercom}
                  onChange={(e) => setIntercom(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>NABL accreditation no.</label>
                <div
                  style={{
                    height: '40px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    fontSize: '14px',
                    background: '#FFFFFF',
                    color: '#111827',
                  }}
                >
                  <input
                    type="text"
                    value={nablNo}
                    onChange={(e) => setNablNo(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: '14px',
                      color: '#111827',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>valid to Aug 2027</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Operating hours */}
          <div
            id="s1"
            style={{
              background: '#FFFFFF',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Operating hours</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Used by Reception when booking tests and by Home Collection</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Row 1 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,1fr) 44px',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>OPD sample collection</span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Mon–Sat</span>
                <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>07:00 – 20:00</span>
                <button
                  type="button"
                  onClick={() => setOpdHoursActive(!opdHoursActive)}
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: opdHoursActive ? '#2563EB' : '#D1D5DB',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: opdHoursActive ? '21px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>

              {/* Row 2 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,1fr) 44px',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Sunday collection</span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Sun</span>
                <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>08:00 – 13:00</span>
                <button
                  type="button"
                  onClick={() => setSundayHoursActive(!sundayHoursActive)}
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: sundayHoursActive ? '#2563EB' : '#D1D5DB',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: sundayHoursActive ? '21px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>

              {/* Row 3 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,1fr) 44px',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Emergency &amp; STAT processing</span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>All days</span>
                <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>24 hours</span>
                <button
                  type="button"
                  onClick={() => setStatHoursActive(!statHoursActive)}
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: statHoursActive ? '#2563EB' : '#D1D5DB',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: statHoursActive ? '21px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>

              {/* Row 4 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,1fr) 44px',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Home collection</span>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Mon–Sat</span>
                <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>07:00 – 11:00</span>
                <button
                  type="button"
                  onClick={() => setHomeCollectionActive(!homeCollectionActive)}
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: homeCollectionActive ? '#2563EB' : '#D1D5DB',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: homeCollectionActive ? '21px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Workflow rules */}
          <div
            id="s2"
            style={{
              background: '#FFFFFF',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Workflow rules</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Controls how orders move between technician, pathologist and the rest of the hospital</span>
            </div>

            {/* Pathologist Sign-off (Locked) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Pathologist sign-off for every result</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  Nothing reaches the doctor, billing or patient record without sign-off. Required for NABL.
                </span>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>Locked</span>
                <span
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: '#2563EB',
                    position: 'relative',
                    display: 'inline-block',
                    opacity: 0.9,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: '21px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                    }}
                  />
                </span>
              </span>
            </div>

            {/* Batch Sign-off */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Batch sign-off for normal results</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Let pathologists approve fully-normal results in one step.</span>
              </div>
              <button
                type="button"
                onClick={() => setBatchSignoffEnabled(!batchSignoffEnabled)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: batchSignoffEnabled ? '#2563EB' : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: batchSignoffEnabled ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Auto-flag out-of-range */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Auto-flag out-of-range values</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  Flags amber for abnormal and red for critical as the technician types, using ranges from the Test Catalog.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoFlagRanges(!autoFlagRanges)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: autoFlagRanges ? '#2563EB' : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: autoFlagRanges ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* When a pathologist requests a re-test (Radio cards) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>When a pathologist requests a re-test</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Where the order goes back to</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Option 1 */}
                <div
                  onClick={() => setRetestRoute('technician_queue')}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    border: retestRoute === 'technician_queue' ? '1px solid #2563EB' : '1px solid #E5E7EB',
                    background: retestRoute === 'technician_queue' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: retestRoute === 'technician_queue' ? '5px solid #2563EB' : '2px solid #D1D5DB',
                      background: '#FFFFFF',
                      marginTop: '1px',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      Original technician, plus a “Returned” tag in the queue
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      Direct alert to the person who entered it; still visible to the whole bench
                    </span>
                  </div>
                </div>

                {/* Option 2 */}
                <div
                  onClick={() => setRetestRoute('technician_only')}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    border: retestRoute === 'technician_only' ? '1px solid #2563EB' : '1px solid #E5E7EB',
                    background: retestRoute === 'technician_only' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: retestRoute === 'technician_only' ? '5px solid #2563EB' : '2px solid #D1D5DB',
                      background: '#FFFFFF',
                      marginTop: '1px',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Original technician only</span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Only they see it until they act</span>
                  </div>
                </div>

                {/* Option 3 */}
                <div
                  onClick={() => setRetestRoute('general_queue')}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    border: retestRoute === 'general_queue' ? '1px solid #2563EB' : '1px solid #E5E7EB',
                    background: retestRoute === 'general_queue' ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: retestRoute === 'general_queue' ? '5px solid #2563EB' : '2px solid #D1D5DB',
                      background: '#FFFFFF',
                      marginTop: '1px',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>General test queue</span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Whoever picks it up next</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Ack Window, Escalate To, Barcode, Sample rejection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Critical acknowledgment window</label>
                <select
                  value={criticalAckWindow}
                  onChange={(e) => setCriticalAckWindow(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="45 minutes">45 minutes</option>
                  <option value="60 minutes">60 minutes</option>
                </select>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>If the doctor has not acknowledged, escalate</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Escalate to</label>
                <select
                  value={escalateTo}
                  onChange={(e) => setEscalateTo(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Department HOD, then Medical Superintendent">
                    Department HOD, then Medical Superintendent
                  </option>
                  <option value="Duty Consultant">Duty Consultant</option>
                  <option value="Chief Medical Officer">Chief Medical Officer</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Specimen barcode format</label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="LAB-YYMM-#### · Code 128">LAB-YYMM-#### · Code 128</option>
                  <option value="UHID-TEST-#### · Code 39">UHID-TEST-#### · Code 39</option>
                  <option value="QR-CODE-2D">QR Code (2D DataMatrix)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Sample rejection reasons</label>
                <input
                  type="text"
                  value={rejectionReasons}
                  onChange={(e) => setRejectionReasons(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Notifications */}
          <div
            id="s3"
            style={{
              background: '#FFFFFF',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Notifications</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Who gets told what, outside the lab</span>
            </div>

            {/* Critical alert channels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  Critical values: urgent alert to ordering doctor
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>In-app alert that must be acknowledged, plus SMS.</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                  }}
                >
                  In-app
                </span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                  }}
                >
                  SMS
                </span>
              </div>
            </div>

            {/* Notify ward nurse */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Notify ward nurse for IPD patients</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>When a report is signed off for an admitted patient.</span>
              </div>
              <button
                type="button"
                onClick={() => setNotifyIpdNurse(!notifyIpdNurse)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: notifyIpdNurse ? '#2563EB' : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: notifyIpdNurse ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Status updates to Assistant */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Status updates to Doctor Assistant</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  Status only (collected, in progress, ready). No clinical values.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNotifyDoctorAssistant(!notifyDoctorAssistant)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: notifyDoctorAssistant ? '#2563EB' : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: notifyDoctorAssistant ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Report ready SMS to patient */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                minHeight: '64px',
                padding: '12px 0',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Report ready SMS to patient</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Sent with a secure download link after sign-off.</span>
              </div>
              <button
                type="button"
                onClick={() => setReportReadySms(!reportReadySms)}
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: reportReadySms ? '#2563EB' : '#D1D5DB',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: reportReadySms ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Section 4: Reports & printing */}
          <div
            id="s4"
            style={{
              background: '#FFFFFF',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Reports &amp; printing</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Layout of the final lab report</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Report template</label>
                <select
                  value={reportTemplate}
                  onChange={(e) => setReportTemplate(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="NABL standard · A4">NABL standard · A4</option>
                  <option value="Compact summary · A4">Compact summary · A4</option>
                  <option value="Letterhead pre-printed · A4">Letterhead pre-printed · A4</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Digital signature</label>
                <select
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Signing pathologist + HOD">Signing pathologist + HOD</option>
                  <option value="Signing pathologist only">Signing pathologist only</option>
                  <option value="Dual sign-off (Technician + Pathologist)">Dual sign-off (Technician + Pathologist)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Show previous result</label>
                <select
                  value={showPreviousResult}
                  onChange={(e) => setShowPreviousResult(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Last 1 result with date">Last 1 result with date</option>
                  <option value="Last 3 results (trend table)">Last 3 results (trend table)</option>
                  <option value="Do not show past results">Do not show past results</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Label printer</label>
                <select
                  value={labelPrinter}
                  onChange={(e) => setLabelPrinter(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Zebra ZD421 · Bench 2">Zebra ZD421 · Bench 2</option>
                  <option value="TSC TE200 · Reception">TSC TE200 · Reception</option>
                  <option value="Brother TD-4550DN · Phlebotomy">Brother TD-4550DN · Phlebotomy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Integrations */}
          <div
            id="s5"
            style={{
              background: '#FFFFFF',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Integrations</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Connections managed by IT; status shown for reference</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    Analyzer interface (LIS middleware)
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>7 analyzers · last message 10:46</span>
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#F0FDF4',
                    color: '#15803D',
                  }}
                >
                  Connected
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '56px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Billing tariff master</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Last sync 09:12</span>
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#F0FDF4',
                    color: '#15803D',
                  }}
                >
                  Connected
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '56px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Home collection app</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Not configured</span>
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#F3F4F6',
                    color: '#374151',
                  }}
                >
                  Off
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LabAdminSettingsView;
