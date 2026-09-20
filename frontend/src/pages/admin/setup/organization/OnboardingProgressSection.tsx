import React, { useState } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  LayoutGrid,
  Shield,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Activity,
  AlertCircle,
  Check,
} from 'lucide-react';

interface OnboardingProgressSectionProps {
  onNavigateToTab: (tab: 'profile' | 'infrastructure' | 'departments' | 'staff') => void;
}

export const OnboardingProgressSection: React.FC<OnboardingProgressSectionProps> = ({
  onNavigateToTab,
}) => {
  const [isGoLiveActivated, setIsGoLiveActivated] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const overallProgress = isGoLiveActivated ? 100 : 92;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>
              Hospital Onboarding & Go-Live Readiness (0% to 100%)
            </h3>
            {isGoLiveActivated ? (
              <span className="badge badge-success" style={{ fontWeight: 700, padding: '0.25rem 0.6rem' }}>
                <Sparkles size={13} /> 100% LIVE IN PRODUCTION
              </span>
            ) : (
              <span className="badge badge-info" style={{ fontWeight: 700, padding: '0.25rem 0.6rem' }}>
                {overallProgress}% ONBOARDING COMPLETED
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Structured hospital onboarding sequence: Profile $\rightarrow$ Campus Infrastructure $\rightarrow$ Departments Space Allocation $\rightarrow$ System Masters $\rightarrow$ Live Clinical Intake
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowVerificationModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: isGoLiveActivated ? '#047857' : 'var(--primary)',
            }}
          >
            <Sparkles size={16} /> {isGoLiveActivated ? 'Hospital is Live • View Audit' : 'Verify Readiness & Go-Live'}
          </button>
        </div>
      </div>

      {/* Progress Bar & Stat Banner */}
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)' }}>
            Hospital Enterprise Onboarding Velocity
          </span>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0284c7' }}>
            {overallProgress}%
          </span>
        </div>
        <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${overallProgress}%`,
              backgroundColor: overallProgress === 100 ? '#10b981' : '#0284c7',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Phase 1: Legal Base (25%)</span>
          <span>Phase 2: Campus Hierarchy (25%)</span>
          <span>Phase 3: Departments (25%)</span>
          <span>Phase 4: System Masters (15%)</span>
          <span>Phase 5: Live Intake (10%)</span>
        </div>
      </div>

      {/* 5 Milestone Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Phase 1 */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#166534' }}>
                  Phase 1: Hospital Identity, Regulatory Licenses & Legal Base
                </strong>
                <span className="badge badge-success">25% / 25% Completed</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#15803d', margin: '0.25rem 0 0.5rem' }}>
                Hospital legal entity, NABH accreditation, 15 KM Emergency Coverage Radius, branding vector assets & central document repository established.
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#166534' }}>
                <span>✓ Identity & Code (NH-MAIN-001)</span>
                <span>✓ GIS Coordinates & 15 KM Radius</span>
                <span>✓ 6 Mandatory Licenses Active</span>
                <span>✓ Hospital Seal & Stamp Uploaded</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('profile')}
            style={{ flexShrink: 0 }}
          >
            Review Profile <ArrowRight size={13} />
          </button>
        </div>

        {/* Phase 2 */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#166534' }}>
                  Phase 2: Campus Physical Infrastructure & Bed Hierarchy
                </strong>
                <span className="badge badge-success">25% / 25% Completed</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#15803d', margin: '0.25rem 0 0.5rem' }}>
                Unified collapsible building tree: 3 Buildings $\rightarrow$ 9 Floors $\rightarrow$ 28 Rooms $\rightarrow$ 10 Wards $\rightarrow$ 240 Beds fully provisioned.
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#166534' }}>
                <span>✓ Main Clinical Tower</span>
                <span>✓ Emergency & Trauma Pavilion</span>
                <span>✓ ICU Ventilators & Deluxe Suites</span>
                <span>✓ Bed Tariffs Set</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('infrastructure')}
            style={{ flexShrink: 0 }}
          >
            Manage Campus <ArrowRight size={13} />
          </button>
        </div>

        {/* Phase 3 */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            backgroundColor: '#f0f9ff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#0369a1' }}>
                  Phase 3: Departments Creation & Physical Space Allocation
                </strong>
                <span className="badge badge-info">22% / 25% Configured</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#0284c7', margin: '0.25rem 0 0.5rem' }}>
                24 Specialized Departments registered across Clinical, Diagnostic, Revenue, Admin, and Support. Department Heads assigned.
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#0369a1' }}>
                <span>✓ 24 Departments Active</span>
                <span>✓ Department Profile View Active</span>
                <span>✓ Infrastructure Space Mapped</span>
                <span>✓ Clinical SOPs Stored</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('departments')}
            style={{ flexShrink: 0 }}
          >
            Configure Units <ArrowRight size={13} />
          </button>
        </div>

        {/* Phase 4 */}
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            backgroundColor: '#fff7ed',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#9a3412' }}>
                  Phase 4: Staff Master & Hospital Shifts Roster (Admin Level)
                </strong>
                <span className="badge badge-warning">14% / 15% Configured</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#c2410c', margin: '0.25rem 0 0.5rem' }}>
                Hospital staff credentials, clinical shift definitions, doctor & nursing rosters, and department leadership bindings configured.
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9a3412' }}>
                <span>✓ Staff Master Active</span>
                <span>✓ Shift Timings Synchronized</span>
                <span>✓ Department HODs Bound</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('staff')}
            style={{ flexShrink: 0 }}
          >
            Manage Staff <ArrowRight size={13} />
          </button>
        </div>

        {/* Phase 5 */}
        <div
          style={{
            padding: '1.25rem',
            border: isGoLiveActivated ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
            borderRadius: '10px',
            backgroundColor: isGoLiveActivated ? '#f0fdf4' : '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: isGoLiveActivated ? '#dcfce7' : '#e2e8f0', color: isGoLiveActivated ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: isGoLiveActivated ? '#166534' : 'var(--secondary)' }}>
                  Phase 5: Department Handover & Live Clinical Intake Readiness
                </strong>
                {isGoLiveActivated ? (
                  <span className="badge badge-success">Hospital Operations Live</span>
                ) : (
                  <span className="badge badge-secondary">Ready for Verification</span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.5rem' }}>
                Audits all clinical beds, verifies emergency ambulances, and unlocks Receptionist, Doctor, Lab, OT, and IPD role consoles for live patient intake.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowVerificationModal(true)}
            style={{ flexShrink: 0 }}
          >
            {isGoLiveActivated ? 'View Live Audit' : 'Complete Go-Live'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GO-LIVE VERIFICATION MODAL */}
      {/* ========================================================================= */}
      {showVerificationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  Hospital Go-Live Verification Audit
                </h3>
              </div>
              <button onClick={() => setShowVerificationModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle size={16} /> <strong>Hospital Legal Identity & Licenses:</strong> NABH, JCI, Fire NOC Active.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle size={16} /> <strong>Campus Infrastructure:</strong> 3 Buildings, 9 Floors, 240 Beds verified.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle size={16} /> <strong>Department Masters:</strong> 24 Departments with appointed Department Heads.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle size={16} /> <strong>System Policies:</strong> UHID Auto-increment (PAT-000001) & Invoicing locked.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle size={16} /> <strong>Role Handover:</strong> Department consoles unlocked for live clinical admissions.
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
              North Hospital Clinical Enterprise is 100% configured and certified for live clinical intake.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowVerificationModal(false)}>Close</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsGoLiveActivated(true);
                  setShowVerificationModal(false);
                }}
              >
                <Sparkles size={14} /> {isGoLiveActivated ? 'Re-confirm Live State' : 'Confirm & Activate Go-Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
