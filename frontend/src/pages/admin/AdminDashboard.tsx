import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  CalendarCheck,
  Activity,
  Shield,
  Building2,
  Stethoscope,
  Coins,
  Settings,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { OrganizationSetup } from './setup/OrganizationSetup';
import { StaffSetup } from './setup/StaffSetup';
import { ClinicalSetup } from './setup/ClinicalSetup';
import { FinancialSetup } from './setup/FinancialSetup';
import { SystemSetup } from './setup/SystemSetup';

export const AdminDashboard: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<
    'overview' | 'organization' | 'staff' | 'clinical' | 'financial' | 'system'
  >('overview');

  return (
    <div>
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h2 className="page-title">Hospital Administration & Enterprise Setup</h2>
            <span className="badge badge-info" style={{ textTransform: 'none', fontWeight: 700 }}>
              Level 2 Master Setup
            </span>
          </div>
          <p className="page-subtitle">
            Hospital-wide KPIs, clinical throughput, role permissions, and full organization setup
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveMainTab('system')}
          >
            <Shield size={16} /> Access & Roles
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActiveMainTab('staff')}
          >
            <Plus size={16} /> + Onboard Staff
          </button>
        </div>
      </div>

      {/* Main Top Tab Navigation (Directly Mapping Level 2 Setup Hierarchy) */}
      <div className="tab-bar">
        <button
          className={`tab-item ${activeMainTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('overview')}
        >
          <Activity size={18} /> Executive Overview
        </button>
        <button
          className={`tab-item ${activeMainTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('organization')}
        >
          <Building2 size={18} /> Organization Setup
        </button>
        <button
          className={`tab-item ${activeMainTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('staff')}
        >
          <Users size={18} /> Staff Setup
        </button>
        <button
          className={`tab-item ${activeMainTab === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('clinical')}
        >
          <Stethoscope size={18} /> Clinical Setup
        </button>
        <button
          className={`tab-item ${activeMainTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('financial')}
        >
          <Coins size={18} /> Financial Setup
        </button>
        <button
          className={`tab-item ${activeMainTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('system')}
        >
          <Settings size={18} /> System Setup
        </button>
      </div>

      <div className="page-body">
        {/* Tab 1: Executive Overview Dashboard */}
        {activeMainTab === 'overview' && (
          <>
            {/* KPI Grid */}
            <div className="stats-grid">
              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveMainTab('organization')}
              >
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div className="stat-value">1,248</div>
                  <div className="stat-label">Total Patients Registered</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <div className="stat-value">84</div>
                  <div className="stat-label">Today's Appointments</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveMainTab('financial')}
              >
                <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <div className="stat-value">$14,850</div>
                  <div className="stat-label">Today's Revenue</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveMainTab('staff')}
              >
                <div className="stat-icon" style={{ backgroundColor: 'var(--teal-light)', color: 'var(--teal)' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <div className="stat-value">18</div>
                  <div className="stat-label">Active Doctors On-Duty</div>
                </div>
              </div>
            </div>

            {/* Operational Status & Audit Stream */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    Department Throughput Overview
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveMainTab('organization')}
                  >
                    Manage Departments <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Staff Active</th>
                        <th>Waiting Queue</th>
                        <th>Completed Today</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>OPD General Medicine</strong></td>
                        <td>6 Doctors</td>
                        <td>14 Patients</td>
                        <td>42 Visits</td>
                        <td><span className="badge badge-success">Optimal</span></td>
                      </tr>
                      <tr>
                        <td><strong>Cardiology & CathLab</strong></td>
                        <td>3 Doctors</td>
                        <td>8 Patients</td>
                        <td>19 Visits</td>
                        <td><span className="badge badge-success">Optimal</span></td>
                      </tr>
                      <tr>
                        <td><strong>Clinical Laboratory</strong></td>
                        <td>4 Techs</td>
                        <td>5 Tests</td>
                        <td>58 Processed</td>
                        <td><span className="badge badge-info">Active</span></td>
                      </tr>
                      <tr>
                        <td><strong>Pharmacy Counter</strong></td>
                        <td>2 Pharmacists</td>
                        <td>3 Orders</td>
                        <td>65 Dispensed</td>
                        <td><span className="badge badge-success">Optimal</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    Recent System Audits
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveMainTab('system')}
                  >
                    Audit Matrix
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>Doctor Profile Updated</div>
                    <div style={{ color: 'var(--text-muted)' }}>Dr. Sarah Jenkins consultation fee adjusted to $75.00</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>10 mins ago • Hospital Admin</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>Invoice Refund Settled</div>
                    <div style={{ color: 'var(--text-muted)' }}>INV-202609-00041 refunded $50.00</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>32 mins ago • Cashier</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>ICU Bed Allocation</div>
                    <div style={{ color: 'var(--text-muted)' }}>Bed ICU-01 allocated to James Sullivan</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>1 hour ago • Nurse Desk</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Organization Setup */}
        {activeMainTab === 'organization' && <OrganizationSetup />}

        {/* Tab 3: Staff Setup */}
        {activeMainTab === 'staff' && <StaffSetup />}

        {/* Tab 4: Clinical Setup */}
        {activeMainTab === 'clinical' && <ClinicalSetup />}

        {/* Tab 5: Financial Setup */}
        {activeMainTab === 'financial' && <FinancialSetup />}

        {/* Tab 6: System Setup */}
        {activeMainTab === 'system' && <SystemSetup />}
      </div>
    </div>
  );
};
