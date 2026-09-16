import React from 'react';
import {
  Users,
  Shield,
  Stethoscope,
  Wrench,
  DollarSign,
  UserCheck,
  Server,
  Building,
  HeartPulse,
  Activity,
  ArrowDown,
  Layers,
} from 'lucide-react';

export const OrgHierarchySection: React.FC = () => {
  return (
    <div className="card">
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
          Governance & Administrative Org Hierarchy
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Organizational reporting lines, clinical superintendent oversight & operations command structure
        </p>
      </div>

      {/* Visual Hierarchy Tree */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        {/* Tier 1: Hospital Owner */}
        <div
          style={{
            border: '2px solid var(--primary)',
            backgroundColor: 'var(--primary-light)',
            borderRadius: '12px',
            padding: '1rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            minWidth: '280px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Tier 1: Ownership</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>Hospital Owner / Board</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>North Healthcare Trust & Trustees</div>
        </div>

        <ArrowDown size={20} color="var(--primary)" />

        {/* Tier 2: Hospital Director */}
        <div
          style={{
            border: '2px solid var(--secondary)',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '1rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
            minWidth: '300px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase' }}>Tier 2: Executive Leadership</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>Harsh Director</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Managing Director & Chief Executive</div>
        </div>

        <ArrowDown size={20} color="var(--primary)" />

        {/* Tier 3: 5 Key Management Branches */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', width: '100%' }}>
          {/* Branch 1: Medical Superintendent */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Stethoscope size={18} />
              <strong style={{ fontSize: '0.9375rem' }}>Medical Superintendent</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Executive Clinical Head: <strong>Dr. Arthur Conan, MD</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
              <span className="badge badge-secondary">• Department Heads (24)</span>
              <span className="badge badge-secondary">• Attending Doctors (18)</span>
              <span className="badge badge-secondary">• Nursing Cadre (42)</span>
              <span className="badge badge-secondary">• Diagnostic Techs (8)</span>
            </div>
          </div>

          {/* Branch 2: Operations Manager */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--teal)' }}>
              <Building size={18} />
              <strong style={{ fontSize: '0.9375rem' }}>Operations Manager</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Head of Operations: <strong>Karen Reynolds, COO</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
              <span className="badge badge-secondary">• Branch Managers (3)</span>
              <span className="badge badge-secondary">• Facility Managers</span>
              <span className="badge badge-secondary">• Housekeeping Team (48)</span>
              <span className="badge badge-secondary">• Campus Security (22)</span>
            </div>
          </div>

          {/* Branch 3: Finance Manager */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
              <DollarSign size={18} />
              <strong style={{ fontSize: '0.9375rem' }}>Finance Manager</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Chief Financial Officer: <strong>Franklin Moore, CPA</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
              <span className="badge badge-secondary">• Patient Billing Desks</span>
              <span className="badge badge-secondary">• Cashier Desk Heads</span>
              <span className="badge badge-secondary">• TPA Insurance Desk</span>
              <span className="badge badge-secondary">• Revenue Audit</span>
            </div>
          </div>

          {/* Branch 4: HR Manager */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
              <UserCheck size={18} />
              <strong style={{ fontSize: '0.9375rem' }}>HR Manager</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Human Resources: <strong>Patricia Wright, SPHR</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
              <span className="badge badge-secondary">• Medical Credentialing</span>
              <span className="badge badge-secondary">• Staff Shift Rostering</span>
              <span className="badge badge-secondary">• Payroll & Benefits</span>
              <span className="badge badge-secondary">• Training & Compliance</span>
            </div>
          </div>

          {/* Branch 5: IT Administrator */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
              <Server size={18} />
              <strong style={{ fontSize: '0.9375rem' }}>IT Administrator</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Chief Information Officer: <strong>David Clark, CISSP</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
              <span className="badge badge-secondary">• HMS Server & Cloud</span>
              <span className="badge badge-secondary">• RBAC & Access Security</span>
              <span className="badge badge-secondary">• PACS & Lab Interfaces</span>
              <span className="badge badge-secondary">• Disaster Recovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
