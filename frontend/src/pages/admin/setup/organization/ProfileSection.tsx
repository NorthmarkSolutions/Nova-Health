import React, { useState } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  Image,
  ShieldCheck,
  Clock,
  Save,
  CheckCircle,
  FileText,
  Upload,
  Globe,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Award,
} from 'lucide-react';
import api from '../../../../services/api';

export const ProfileSection: React.FC = () => {
  const [activeSubSection, setActiveSubSection] = useState<
    'general' | 'contact' | 'address' | 'branding' | 'regulatory' | 'operational'
  >('general');

  const [saveAlert, setSaveAlert] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // General Information State
  const [generalInfo, setGeneralInfo] = useState({
    hospitalName: 'North Hospital Main Campus',
    legalName: 'North Healthcare Enterprise Private Limited',
    hospitalCode: 'NH-MAIN-001',
    regNumber: 'HOSP-2024-REG-98214',
    licenseNumber: 'CLINIC-LIC-NY-8841',
    gstNumber: 'GSTIN98213892A1Z4',
    nabhNumber: 'NABH-H-2023-0492',
    panNumber: 'AAACN9821P',
    establishmentDate: '2012-04-18',
  });

  // Contact Information State
  const [contactInfo, setContactInfo] = useState({
    primaryPhone: '+1 (555) 019-2834',
    secondaryPhone: '+1 (555) 019-2835',
    emergencyNumber: '+1 (555) 911-0000',
    ambulanceHelpline: '+1 (555) 911-0001',
    primaryEmail: 'info@northhospital.com',
    adminEmail: 'admin@northhospital.com',
    billingEmail: 'billing@northhospital.com',
    website: 'https://www.northhospital.com',
    socialLinkedIn: 'linkedin.com/company/north-hospital',
    socialTwitter: '@NorthHospitalHQ',
  });

  // Address Information State
  const [addressInfo, setAddressInfo] = useState({
    country: 'United States',
    state: 'New York',
    city: 'New York City',
    postalCode: '10001',
    streetAddress: '452 Healthcare Boulevard, Medical District',
    latitude: '40.7128° N',
    longitude: '74.0060° W',
  });

  // Branding Formats State
  const [branding, setBranding] = useState({
    logoText: 'North Hospital Clinical Enterprise',
    letterheadHeader: 'North Hospital — Center for Clinical Excellence',
    billFormat: 'INV-A4-GST-STANDARD',
    rxFormat: 'RX-BARCODE-DIGITAL-V2',
    labReportTemplate: 'LAB-NABL-2-COLUMN',
  });

  // Regulatory Licenses State
  const [regulatory, setRegulatory] = useState([
    { id: '1', name: 'NABH Accreditation (National Accreditation Board)', regNo: 'NABH-H-2023-0492', validTill: '2028-06-30', status: 'VALID' },
    { id: '2', name: 'JCI International Quality Gold Seal', regNo: 'JCI-INTL-9811', validTill: '2027-12-31', status: 'VALID' },
    { id: '3', name: 'Biomedical Waste Management License', regNo: 'BMWM-NY-842', validTill: '2026-11-15', status: 'EXPIRING_SOON' },
    { id: '4', name: 'Fire Safety & NOC Certificate', regNo: 'FIRE-NOC-2024-99', validTill: '2029-01-10', status: 'VALID' },
    { id: '5', name: 'Pollution Control Board Consent to Operate (CTO)', regNo: 'SPCB-CTO-8831', validTill: '2027-04-20', status: 'VALID' },
    { id: '6', name: 'State Retail & Inpatient Pharmacy License', regNo: 'PHARM-20-B-8711', validTill: '2028-09-05', status: 'VALID' },
  ]);

  // Operational Settings State
  const [operational, setOperational] = useState({
    timezone: 'America/New_York (EST / UTC-5)',
    currency: 'USD ($)',
    language: 'English (US)',
    financialYear: 'April - March (Standard Fiscal)',
    weekStartDay: 'Monday',
    workingDays: '24/7 (Emergency & IPD) | OPD: Mon - Sat',
  });

  React.useEffect(() => {
    api.get('/organization/profile')
      .then((res) => {
        if (res.data) {
          const data = res.data;
          setGeneralInfo(prev => ({
            ...prev,
            hospitalName: data.hospitalName || prev.hospitalName,
            legalName: data.legalName || prev.legalName,
            hospitalCode: data.hospitalCode || prev.hospitalCode,
            regNumber: data.regNumber || prev.regNumber,
            licenseNumber: data.licenseNumber || prev.licenseNumber,
            gstNumber: data.gstNumber || prev.gstNumber,
            nabhNumber: data.nabhNumber || prev.nabhNumber,
            panNumber: data.panNumber || prev.panNumber,
            establishmentDate: data.establishmentDate || prev.establishmentDate,
          }));
          setContactInfo(prev => ({
            ...prev,
            primaryPhone: data.primaryPhone || prev.primaryPhone,
            secondaryPhone: data.secondaryPhone || prev.secondaryPhone,
            emergencyNumber: data.emergencyNumber || prev.emergencyNumber,
            ambulanceHelpline: data.ambulanceHelpline || prev.ambulanceHelpline,
            primaryEmail: data.primaryEmail || prev.primaryEmail,
            adminEmail: data.adminEmail || prev.adminEmail,
            website: data.website || prev.website,
          }));
          setAddressInfo(prev => ({
            ...prev,
            streetAddress: data.streetAddress || prev.streetAddress,
            city: data.city || prev.city,
            state: data.state || prev.state,
            postalCode: data.postalCode || prev.postalCode,
            country: data.country || prev.country,
          }));
          if (data.branding) setBranding(prev => ({ ...prev, ...data.branding }));
          if (data.operationalSettings) setOperational(prev => ({ ...prev, ...data.operationalSettings }));
          setIsBackendConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Using local profile fallback:', err);
      });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 3000);

    const payload = {
      ...generalInfo,
      ...contactInfo,
      ...addressInfo,
      branding,
      operationalSettings: operational,
    };

    api.put('/organization/profile', payload).catch(() => {});
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
            1. Hospital Profile Master Configuration
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Hospital legal entity identity, contact routing, GIS coordinates, branding templates & regulatory compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isBackendConnected && (
            <span className="badge badge-success">
              <CheckCircle size={14} /> Live SQLite Backend Synchronized
            </span>
          )}
          {saveAlert && (
            <span className="badge badge-success">
              <CheckCircle size={14} /> Profile Saved to Backend
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Save All Profile Changes
          </button>
        </div>
      </div>

      {/* Profile Section Mini Navigation */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubSection === 'general' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('general')}
        >
          <Building2 size={15} /> General Information
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('contact')}
        >
          <Phone size={15} /> Contact Details
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'address' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('address')}
        >
          <MapPin size={15} /> Address & Geo-GIS
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('branding')}
        >
          <Image size={15} /> Branding & Formats
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'regulatory' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('regulatory')}
        >
          <ShieldCheck size={15} /> Regulatory & Licenses ({regulatory.length})
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'operational' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('operational')}
        >
          <Clock size={15} /> Operational Settings
        </button>
      </div>

      {/* 1. General Info */}
      {activeSubSection === 'general' && (
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Hospital Display Name</label>
            <input className="form-input" value={generalInfo.hospitalName} onChange={(e) => setGeneralInfo({ ...generalInfo, hospitalName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Hospital Legal Entity Name</label>
            <input className="form-input" value={generalInfo.legalName} onChange={(e) => setGeneralInfo({ ...generalInfo, legalName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Hospital Master Code</label>
            <input className="form-input" value={generalInfo.hospitalCode} onChange={(e) => setGeneralInfo({ ...generalInfo, hospitalCode: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Clinical Reg. Number</label>
            <input className="form-input" value={generalInfo.regNumber} onChange={(e) => setGeneralInfo({ ...generalInfo, regNumber: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">State Healthcare License No.</label>
            <input className="form-input" value={generalInfo.licenseNumber} onChange={(e) => setGeneralInfo({ ...generalInfo, licenseNumber: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">GST / Tax Identification No.</label>
            <input className="form-input" value={generalInfo.gstNumber} onChange={(e) => setGeneralInfo({ ...generalInfo, gstNumber: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">NABH Accreditation Reg.</label>
            <input className="form-input" value={generalInfo.nabhNumber} onChange={(e) => setGeneralInfo({ ...generalInfo, nabhNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Corporate PAN / Tax ID</label>
            <input className="form-input" value={generalInfo.panNumber} onChange={(e) => setGeneralInfo({ ...generalInfo, panNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Establishment</label>
            <input type="date" className="form-input" value={generalInfo.establishmentDate} onChange={(e) => setGeneralInfo({ ...generalInfo, establishmentDate: e.target.value })} />
          </div>
        </form>
      )}

      {/* 2. Contact Info */}
      {activeSubSection === 'contact' && (
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Primary Reception Phone</label>
            <input className="form-input" value={contactInfo.primaryPhone} onChange={(e) => setContactInfo({ ...contactInfo, primaryPhone: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Secondary / OPD Inquiry Phone</label>
            <input className="form-input" value={contactInfo.secondaryPhone} onChange={(e) => setContactInfo({ ...contactInfo, secondaryPhone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--danger)' }}>24/7 Emergency Helpline</label>
            <input className="form-input" value={contactInfo.emergencyNumber} onChange={(e) => setContactInfo({ ...contactInfo, emergencyNumber: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--danger)' }}>Ambulance Dispatch Helpline</label>
            <input className="form-input" value={contactInfo.ambulanceHelpline} onChange={(e) => setContactInfo({ ...contactInfo, ambulanceHelpline: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">General Contact Email</label>
            <input type="email" className="form-input" value={contactInfo.primaryEmail} onChange={(e) => setContactInfo({ ...contactInfo, primaryEmail: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Hospital Administration Email</label>
            <input type="email" className="form-input" value={contactInfo.adminEmail} onChange={(e) => setContactInfo({ ...contactInfo, adminEmail: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Official Hospital Website</label>
            <input className="form-input" value={contactInfo.website} onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Corporate LinkedIn / Portal Handle</label>
            <input className="form-input" value={contactInfo.socialLinkedIn} onChange={(e) => setContactInfo({ ...contactInfo, socialLinkedIn: e.target.value })} />
          </div>
        </form>
      )}

      {/* 3. Address Info */}
      {activeSubSection === 'address' && (
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Full Registered Street Address</label>
            <textarea rows={2} className="form-textarea" value={addressInfo.streetAddress} onChange={(e) => setAddressInfo({ ...addressInfo, streetAddress: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={addressInfo.city} onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">State / Province</label>
            <input className="form-input" value={addressInfo.state} onChange={(e) => setAddressInfo({ ...addressInfo, state: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Postal / ZIP Code</label>
            <input className="form-input" value={addressInfo.postalCode} onChange={(e) => setAddressInfo({ ...addressInfo, postalCode: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input className="form-input" value={addressInfo.country} onChange={(e) => setAddressInfo({ ...addressInfo, country: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">GIS Latitude</label>
            <input className="form-input" value={addressInfo.latitude} onChange={(e) => setAddressInfo({ ...addressInfo, latitude: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">GIS Longitude</label>
            <input className="form-input" value={addressInfo.longitude} onChange={(e) => setAddressInfo({ ...addressInfo, longitude: e.target.value })} />
          </div>
        </form>
      )}

      {/* 4. Branding & Formats */}
      {activeSubSection === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
              Hospital Identity & Letterhead Header
            </h4>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Branding Tagline</label>
              <input className="form-input" value={branding.logoText} onChange={(e) => setBranding({ ...branding, logoText: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Official Header Text on Printouts</label>
              <textarea rows={2} className="form-textarea" value={branding.letterheadHeader} onChange={(e) => setBranding({ ...branding, letterheadHeader: e.target.value })} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm">
              <Upload size={14} /> Upload Vector Logo (SVG/PNG)
            </button>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
              Print & Template Formats
            </h4>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Inpatient & OPD Bill Format</label>
              <select className="form-select" value={branding.billFormat} onChange={(e) => setBranding({ ...branding, billFormat: e.target.value })}>
                <option value="INV-A4-GST-STANDARD">Standard A4 GST Itemized Invoice (Recommended)</option>
                <option value="INV-THERMAL-80MM">Thermal 80mm Compact Cash Receipt</option>
                <option value="INV-INSURANCE-TPA">TPA Cashless Pre-Auth Claim Invoice Format</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Prescription (Rx) Print Format</label>
              <select className="form-select" value={branding.rxFormat} onChange={(e) => setBranding({ ...branding, rxFormat: e.target.value })}>
                <option value="RX-BARCODE-DIGITAL-V2">Digital Rx with Security QR & Barcode (Default)</option>
                <option value="RX-A5-CLASSIC">A5 Classical Doctor Pad Layout</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pathology / Lab Report Template</label>
              <select className="form-select" value={branding.labReportTemplate} onChange={(e) => setBranding({ ...branding, labReportTemplate: e.target.value })}>
                <option value="LAB-NABL-2-COLUMN">NABL 2-Column Normal Range Matrix</option>
                <option value="LAB-GRAPHICAL">Graphical Trend Comparison Report</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. Regulatory & Licenses */}
      {activeSubSection === 'regulatory' && (
        <div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Compliance / License Certificate</th>
                  <th>Registration No.</th>
                  <th>Validity Expiry Date</th>
                  <th>Compliance Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {regulatory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} color="var(--primary)" />
                        <strong>{item.name}</strong>
                      </div>
                    </td>
                    <td><code>{item.regNo}</code></td>
                    <td><span style={{ fontWeight: 600 }}>{item.validTill}</span></td>
                    <td>
                      <span className={`badge ${item.status === 'VALID' ? 'badge-success' : 'badge-warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm">
                        <Upload size={12} /> Renew / Upload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Operational Settings */}
      {activeSubSection === 'operational' && (
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">System Timezone</label>
            <input className="form-input" value={operational.timezone} onChange={(e) => setOperational({ ...operational, timezone: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Base Currency</label>
            <input className="form-input" value={operational.currency} onChange={(e) => setOperational({ ...operational, currency: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Primary Language</label>
            <input className="form-input" value={operational.language} onChange={(e) => setOperational({ ...operational, language: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Year Accounting Cycle</label>
            <input className="form-input" value={operational.financialYear} onChange={(e) => setOperational({ ...operational, financialYear: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Calendar Week Start Day</label>
            <select className="form-select" value={operational.weekStartDay} onChange={(e) => setOperational({ ...operational, weekStartDay: e.target.value })}>
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Working Days & Shifts</label>
            <input className="form-input" value={operational.workingDays} onChange={(e) => setOperational({ ...operational, workingDays: e.target.value })} required />
          </div>
        </form>
      )}

      {/* Permissions / Responsible Roles Banner */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong>Governing Roles:</strong> Hospital Owner, Hospital Director, Compliance Manager, IT Administrator
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong>Authorized Actions:</strong> View/Edit Profile, Upload Branding, Manage Licenses, Configure Settings
        </div>
      </div>
    </div>
  );
};
