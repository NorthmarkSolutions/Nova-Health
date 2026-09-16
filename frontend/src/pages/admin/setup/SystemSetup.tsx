import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Bell,
  MessageSquare,
  Smartphone,
  Mail,
  CheckCircle,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  Send,
} from 'lucide-react';

export const SystemSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'roles' | 'permissions' | 'notifications' | 'sms' | 'whatsapp' | 'email'
  >('roles');

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Roles State
  const [roles, setRoles] = useState([
    { id: '1', name: 'SUPER_ADMIN', label: 'Super Administrator', users: 1, desc: 'Full multi-tenant system & master configuration access', status: 'ACTIVE' },
    { id: '2', name: 'HOSPITAL_ADMIN', label: 'Hospital Administrator', users: 2, desc: 'Hospital organization, staff, clinical & billing setup management', status: 'ACTIVE' },
    { id: '3', name: 'DOCTOR', label: 'Medical Doctor (OPD/IPD)', users: 18, desc: 'Clinical consultations, SOAP diagnosis, prescriptions & lab ordering', status: 'ACTIVE' },
    { id: '4', name: 'NURSE', label: 'Registered Nurse', users: 42, desc: 'Vitals recording, triage assessment, ward bed care & medication admin', status: 'ACTIVE' },
    { id: '5', name: 'PHARMACIST', label: 'Clinical Pharmacist', users: 6, desc: 'Prescription queue dispensing, drug stock inventory & batch control', status: 'ACTIVE' },
    { id: '6', name: 'LAB_TECH', label: 'Laboratory Technician', users: 8, desc: 'Sample intake, specimen processing, result entry & critical flags', status: 'ACTIVE' },
    { id: '7', name: 'CASHIER', label: 'Billing Cashier / Accountant', users: 5, desc: 'Patient invoicing, advance deposits, payment settlements & receipts', status: 'ACTIVE' },
    { id: '8', name: 'RECEPTIONIST', label: 'Front Desk Receptionist', users: 12, desc: 'Patient registration, appointment scheduling & live token generation', status: 'ACTIVE' },
    { id: '9', name: 'PATIENT', label: 'Patient Companion User', users: 1248, desc: 'View-only access to appointments, medical records & digital bills', status: 'ACTIVE' },
  ]);

  // Permission Matrix State
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({
    'Patient Registration': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: true, DOCTOR: false, NURSE: false, CASHIER: false },
    'Appointment Booking': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: true, DOCTOR: true, NURSE: false, CASHIER: false },
    'Nurse Vitals Triage': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: true, NURSE: true, CASHIER: false },
    'Doctor Consultation & SOAP': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: true, NURSE: false, CASHIER: false },
    'E-Prescription Writing': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: true, NURSE: false, CASHIER: false },
    'Order Diagnostic Lab Tests': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: true, NURSE: true, CASHIER: false },
    'Enter Lab Results': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: false },
    'Dispense Pharmacy Meds': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: false },
    'Invoice Creation & Billing': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: true },
    'Collect Payments & Receipts': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: true },
    'Manage Staff & Roles': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: false },
    'System Audit Inspection': { SUPER_ADMIN: true, HOSPITAL_ADMIN: true, RECEPTIONIST: false, DOCTOR: false, NURSE: false, CASHIER: false },
  });

  const togglePermission = (module: string, roleKey: string) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [roleKey]: !prev[module]?.[roleKey],
      },
    }));
  };

  // Notification Channels State
  const [notifications, setNotifications] = useState({
    codeBlueAlert: true,
    criticalLabAlert: true,
    emergencyBedShortage: true,
    pharmacyLowStock: true,
    dailyRevenueReport: true,
    patientSmsReminder: true,
  });

  // SMS Settings State
  const [smsConfig, setSmsConfig] = useState({
    provider: 'Twilio Cloud SMS',
    accountSid: 'AC_982183491829381923',
    authToken: '••••••••••••••••••••••••',
    senderId: 'NRTHSP',
    appointmentTemplate: 'Dear {patient_name}, your appointment with {doctor_name} is confirmed for {date} at {time}. Token #{token}.',
  });

  // WhatsApp Settings State
  const [whatsappConfig, setWhatsappConfig] = useState({
    provider: 'Meta WhatsApp Cloud API',
    phoneNumberId: '10928374619283',
    wabaId: '39281726354192',
    apiKey: 'EAAG9821••••••••••••••••',
    sendDigitalPrescription: true,
    sendInvoicePdf: true,
  });

  // Email SMTP Settings State
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: 'smtp.mailgun.org',
    smtpPort: '587',
    username: 'postmaster@northhospital.com',
    password: '••••••••••••••••',
    fromEmail: 'noreply@northhospital.com',
    fromName: 'North Hospital Notifications',
    enableSSL: true,
  });

  const triggerSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      {/* Subtabs Pill Bar */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('roles')}
        >
          <Shield size={16} /> User Roles ({roles.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('permissions')}
        >
          <KeyRound size={16} /> Permissions Matrix
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('notifications')}
        >
          <Bell size={16} /> Notifications & Alerts
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sms')}
        >
          <Smartphone size={16} /> SMS Gateway
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('whatsapp')}
        >
          <MessageSquare size={16} /> WhatsApp Business API
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('email')}
        >
          <Mail size={16} /> Email SMTP Server
        </button>
      </div>

      {saveSuccess && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-light)', color: '#065f46', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> System configuration changes saved successfully!
        </div>
      )}

      {/* 1. Roles */}
      {activeSubTab === 'roles' && (
        <div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Role Identifier</th>
                  <th>Display Label</th>
                  <th>Description & Access Scope</th>
                  <th>Active Users</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td><code>{role.name}</code></td>
                    <td><strong>{role.label}</strong></td>
                    <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{role.desc}</span></td>
                    <td><span className="badge badge-info">{role.users} Accounts</span></td>
                    <td><span className="badge badge-success">{role.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Permission Matrix */}
      {activeSubTab === 'permissions' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>Granular Role-Based Access Control (RBAC) Matrix</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toggle operational permissions per user role</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }}>
              <Save size={16} /> Save Permission Matrix
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>HMS Module / Operation</th>
                  <th style={{ textAlign: 'center' }}>Super Admin</th>
                  <th style={{ textAlign: 'center' }}>Hospital Admin</th>
                  <th style={{ textAlign: 'center' }}>Receptionist</th>
                  <th style={{ textAlign: 'center' }}>Doctor</th>
                  <th style={{ textAlign: 'center' }}>Nurse</th>
                  <th style={{ textAlign: 'center' }}>Cashier</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(permissionMatrix).map((module) => (
                  <tr key={module}>
                    <td><strong>{module}</strong></td>
                    {['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'CASHIER'].map((roleKey) => (
                      <td key={roleKey} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={permissionMatrix[module]?.[roleKey] || false}
                          onChange={() => togglePermission(module, roleKey)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Notifications */}
      {activeSubTab === 'notifications' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--secondary)' }}>
            Hospital Broadcast & Trigger Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>Emergency Code Blue Broadcast</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Instantly notify all on-duty ICU doctors and crash cart nurses</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={notifications.codeBlueAlert}
                  onChange={(e) => setNotifications({ ...notifications, codeBlueAlert: e.target.checked })}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>Critical Diagnostic Lab Value Alarm</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Trigger audio-visual alert on doctor workstation for life-threatening lab flags</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={notifications.criticalLabAlert}
                  onChange={(e) => setNotifications({ ...notifications, criticalLabAlert: e.target.checked })}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>ICU / Ventilator Bed Shortage Warning</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Alert operations desk when ICU bed occupancy exceeds 90%</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={notifications.emergencyBedShortage}
                  onChange={(e) => setNotifications({ ...notifications, emergencyBedShortage: e.target.checked })}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>Automated Patient SMS Appointment Reminder</strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Send SMS 2 hours prior to scheduled consultation slot</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={notifications.patientSmsReminder}
                  onChange={(e) => setNotifications({ ...notifications, patientSmsReminder: e.target.checked })}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={() => { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }}>
                <Save size={16} /> Save Alert Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SMS Gateway */}
      {activeSubTab === 'sms' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--secondary)' }}>
            SMS Gateway Configuration
          </h3>

          <form onSubmit={triggerSaveAlert} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">SMS Provider</label>
              <select className="form-select" value={smsConfig.provider} onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value })}>
                <option value="Twilio Cloud SMS">Twilio Cloud SMS</option>
                <option value="AWS SNS">AWS Simple Notification Service (SNS)</option>
                <option value="MSG91 Enterprise">MSG91 Enterprise</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Approved Sender ID (Header)</label>
              <input className="form-input" value={smsConfig.senderId} onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Account SID / API Key</label>
              <input className="form-input" value={smsConfig.accountSid} onChange={(e) => setSmsConfig({ ...smsConfig, accountSid: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Auth Token / Secret</label>
              <input className="form-input" type="password" value={smsConfig.authToken} onChange={(e) => setSmsConfig({ ...smsConfig, authToken: e.target.value })} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Default Appointment Confirmation Template</label>
              <textarea rows={3} className="form-textarea" value={smsConfig.appointmentTemplate} onChange={(e) => setSmsConfig({ ...smsConfig, appointmentTemplate: e.target.value })} />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save SMS Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. WhatsApp API */}
      {activeSubTab === 'whatsapp' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--secondary)' }}>
            WhatsApp Business API Integration
          </h3>

          <form onSubmit={triggerSaveAlert} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">WhatsApp Provider</label>
              <select className="form-select" value={whatsappConfig.provider} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value })}>
                <option value="Meta WhatsApp Cloud API">Meta WhatsApp Cloud API (Direct)</option>
                <option value="Twilio WhatsApp API">Twilio WhatsApp API</option>
                <option value="Gupshup Enterprise">Gupshup Enterprise</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Phone Number ID</label>
              <input className="form-input" value={whatsappConfig.phoneNumberId} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Business Account (WABA) ID</label>
              <input className="form-input" value={whatsappConfig.wabaId} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, wabaId: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Permanent Access Token</label>
              <input className="form-input" type="password" value={whatsappConfig.apiKey} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })} required />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={whatsappConfig.sendDigitalPrescription}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, sendDigitalPrescription: e.target.checked })}
                />
                <span style={{ fontSize: '0.875rem' }}>Automatically share PDF prescription on patient WhatsApp upon doctor sign-off</span>
              </label>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={whatsappConfig.sendInvoicePdf}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, sendInvoicePdf: e.target.checked })}
                />
                <span style={{ fontSize: '0.875rem' }}>Automatically deliver finalized hospital invoice & payment receipt via WhatsApp</span>
              </label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save WhatsApp Integration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Email SMTP */}
      {activeSubTab === 'email' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--secondary)' }}>
            Hospital SMTP Mail Server
          </h3>

          <form onSubmit={triggerSaveAlert} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">SMTP Server Host</label>
              <input className="form-input" value={emailConfig.smtpHost} onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input className="form-input" value={emailConfig.smtpPort} onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Username</label>
              <input className="form-input" value={emailConfig.username} onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Password</label>
              <input className="form-input" type="password" value={emailConfig.password} onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Sender From Name</label>
              <input className="form-input" value={emailConfig.fromName} onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Sender From Email</label>
              <input type="email" className="form-input" value={emailConfig.fromEmail} onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })} required />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => alert('Test email sent to admin@northhospital.com!')}>
                <Send size={16} /> Send Test Email
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save SMTP Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
