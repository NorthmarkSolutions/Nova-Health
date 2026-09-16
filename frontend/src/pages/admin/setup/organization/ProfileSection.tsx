import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  Image,
  ShieldCheck,
  Clock,
  FileText,
  Save,
  CheckCircle,
  CheckCircle2,
  Upload,
  Globe,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Award,
  History,
  Archive,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Download,
  ExternalLink,
  Layers,
  Stethoscope,
  BedDouble,
  Activity,
  Scissors,
  Users,
  Check,
  X,
  FileCheck,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import api from '../../../../services/api';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DepartmentContact {
  id: string;
  name: string;
  phone: string;
  isPrimary: boolean;
  active: boolean;
}

interface RegulatoryLicense {
  id: string;
  name: string;
  regNo: string;
  issueDate: string;
  validTill: string;
  documentFile: string;
  status: 'VALID' | 'EXPIRING_90' | 'EXPIRING_60' | 'EXPIRING_30' | 'EXPIRED';
}

interface HospitalDocument {
  id: string;
  title: string;
  category: 'Registration' | 'NABH' | 'Fire NOC' | 'Insurance' | 'Contracts' | 'SOP' | 'Policies';
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'Active' | 'Under Review' | 'Archived';
  fileSize: string;
}

export const ProfileSection: React.FC = () => {
  const [activeSubSection, setActiveSubSection] = useState<
    'general' | 'contact' | 'address' | 'branding' | 'regulatory' | 'operational' | 'documents'
  >('general');

  const [saveAlert, setSaveAlert] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Template Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<{
    isOpen: boolean;
    type: 'prescription' | 'invoice' | 'lab' | 'discharge';
  }>({
    isOpen: false,
    type: 'prescription',
  });

  // Modals
  const [showAddLicenseModal, setShowAddLicenseModal] = useState(false);
  const [showRenewLicenseModal, setShowRenewLicenseModal] = useState<RegulatoryLicense | null>(null);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  // 1. General Information State
  const [generalInfo, setGeneralInfo] = useState(() => {
    const saved = localStorage.getItem('hms_profile_general');
    return saved
      ? JSON.parse(saved)
      : {
          hospitalName: 'North Hospital Main Campus',
          shortName: 'North Hospital',
          hospitalCode: 'NH-MAIN-001',
          legalName: 'North Healthcare Enterprise Private Limited',
          establishmentDate: '2012-04-18',
          // Hospital Classification
          hospitalType: 'Super Specialty',
          ownership: 'Private',
          teachingHospital: 'Yes',
          // Capacity Information
          totalBeds: 250,
          totalDepartments: 18,
          totalDoctors: 45,
          totalOtRooms: 6,
          totalIcuBeds: 30,
        };
  });

  // 2. Contact Details State
  const [contacts, setContacts] = useState<DepartmentContact[]>(() => {
    const saved = localStorage.getItem('hms_profile_contacts');
    return saved
      ? JSON.parse(saved)
      : [
          { id: '1', name: 'Reception & Patient Desk', phone: '+1 (555) 019-2834', isPrimary: true, active: true },
          { id: '2', name: '24/7 Emergency Helpline', phone: '+1 (555) 911-0000', isPrimary: false, active: true },
          { id: '3', name: 'Ambulance Dispatch Helpline', phone: '+1 (555) 911-0001', isPrimary: false, active: true },
          { id: '4', name: 'Billing & Cashier Desk', phone: '+1 (555) 019-2840', isPrimary: false, active: true },
          { id: '5', name: 'Human Resources (HR)', phone: '+1 (555) 019-2850', isPrimary: false, active: true },
          { id: '6', name: 'IT & Infrastructure Support', phone: '+1 (555) 019-2860', isPrimary: false, active: true },
        ];
  });

  const [contactEmails, setContactEmails] = useState(() => {
    const saved = localStorage.getItem('hms_profile_emails');
    return saved
      ? JSON.parse(saved)
      : {
          generalEmail: 'info@northhospital.com',
          adminEmail: 'admin@northhospital.com',
          billingEmail: 'billing@northhospital.com',
          hrEmail: 'hr@northhospital.com',
          website: 'https://www.northhospital.com',
          socialFacebook: 'facebook.com/northhospital',
          socialInstagram: '@northhospital_health',
          socialLinkedIn: 'linkedin.com/company/north-hospital',
        };
  });

  // 3. Address & Location State
  const [addressInfo, setAddressInfo] = useState(() => {
    const saved = localStorage.getItem('hms_profile_address');
    return saved
      ? JSON.parse(saved)
      : {
          streetAddress: '452 Healthcare Boulevard, Medical District',
          city: 'New York City',
          state: 'New York',
          postalCode: '10001',
          country: 'United States',
          googleMapsUrl: 'https://maps.google.com/?q=40.7128,-74.0060',
          latitude: '40.7128° N',
          longitude: '74.0060° W',
          coverageRadiusKm: '15 KM',
        };
  });

  // 4. Branding & Documents State
  const [branding, setBranding] = useState(() => {
    const saved = localStorage.getItem('hms_profile_branding');
    return saved
      ? JSON.parse(saved)
      : {
          logoUrl: '',
          logoText: 'North Hospital Clinical Enterprise',
          letterheadHeader: 'North Hospital — Center for Clinical Excellence & Tertiary Care',
          hasSeal: true,
          hasStamp: true,
          hasDigitalSignature: true,
          // Document Templates
          prescriptionTemplate: 'RX-DIGITAL-QR',
          invoiceTemplate: 'INV-A4-GST-STANDARD',
          labReportTemplate: 'LAB-NABL-2-COLUMN',
          dischargeTemplate: 'DISCHARGE-IPD-COMPREHENSIVE',
          // Print settings
          paperSize: 'A4',
        };
  });

  // 5. Regulatory Licenses State
  const [regulatory, setRegulatory] = useState<RegulatoryLicense[]>(() => {
    const saved = localStorage.getItem('hms_profile_regulatory');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: '1',
            name: 'NABH Hospital Accreditation Certificate',
            regNo: 'NABH-H-2023-0492',
            issueDate: '2023-07-01',
            validTill: '2028-06-30',
            documentFile: 'NABH_Accreditation_Certificate_2028.pdf',
            status: 'VALID',
          },
          {
            id: '2',
            name: 'State Healthcare Directorate Clinical License',
            regNo: 'CLINIC-LIC-NY-8841',
            issueDate: '2022-01-15',
            validTill: '2027-01-14',
            documentFile: 'State_Clinical_Establishment_Lic.pdf',
            status: 'VALID',
          },
          {
            id: '3',
            name: 'Biomedical Waste Management License',
            regNo: 'BMWM-NY-842',
            issueDate: '2023-11-15',
            validTill: '2026-11-15',
            documentFile: 'Biomedical_Waste_NY_Consent.pdf',
            status: 'EXPIRING_60',
          },
          {
            id: '4',
            name: 'Fire Department Safety & NOC Certificate',
            regNo: 'FIRE-NOC-2024-99',
            issueDate: '2024-01-10',
            validTill: '2029-01-10',
            documentFile: 'Fire_Safety_NOC_Hospital_Tower.pdf',
            status: 'VALID',
          },
          {
            id: '5',
            name: 'State Pollution Control Board Consent to Operate (CTO)',
            regNo: 'SPCB-CTO-8831',
            issueDate: '2022-04-20',
            validTill: '2026-10-10',
            documentFile: 'SPCB_CTO_Air_Water_Consent.pdf',
            status: 'EXPIRING_30',
          },
          {
            id: '6',
            name: 'Retail & Inpatient 24/7 Pharmacy License (Form 20B/21B)',
            regNo: 'PHARM-20-B-8711',
            issueDate: '2023-09-05',
            validTill: '2028-09-05',
            documentFile: 'FDA_Pharmacy_License_20B_21B.pdf',
            status: 'VALID',
          },
        ];
  });

  // 6. Operational Settings State
  const [operational, setOperational] = useState(() => {
    const saved = localStorage.getItem('hms_profile_operational');
    return saved
      ? JSON.parse(saved)
      : {
          // Time Settings
          timezone: 'America/New_York (EST / UTC-5)',
          workingDays: '24/7 (Emergency & IPD) | OPD: Mon - Sat (08:00 - 20:00)',
          weekStartDay: 'Monday',
          fiscalYear: 'April - March (Standard Fiscal)',
          // Patient Settings
          uhidPrefix: 'PAT-000001',
          // Appointment Settings
          appointmentDuration: '20 min',
          walkInAllowed: 'Yes',
          // Admission Settings
          requireDeposit: 'Yes',
          autoBedAssignment: 'No',
          // Billing Settings
          gstEnabled: 'Yes',
          discountApprovalRequired: 'Yes',
        };
  });

  // 7. Hospital Documents State
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');
  const [documents, setDocuments] = useState<HospitalDocument[]>(() => {
    const saved = localStorage.getItem('hms_hospital_documents');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'doc-1',
            title: 'Hospital Incorporation & Corporate Registration Certificate',
            category: 'Registration',
            fileName: 'North_Hospital_Certificate_of_Incorporation.pdf',
            uploadDate: '2024-01-10',
            status: 'Active',
            fileSize: '2.4 MB',
          },
          {
            id: 'doc-2',
            title: 'NABH 5th Edition Full Accreditation Gold Standard Dossier',
            category: 'NABH',
            fileName: 'NABH_Hospital_Accreditation_Final.pdf',
            uploadDate: '2023-07-02',
            expiryDate: '2028-06-30',
            status: 'Active',
            fileSize: '8.1 MB',
          },
          {
            id: 'doc-3',
            title: 'Municipal Fire Safety & Evacuation Audit NOC',
            category: 'Fire NOC',
            fileName: 'Fire_Safety_NOC_Building_A_B.pdf',
            uploadDate: '2024-01-12',
            expiryDate: '2029-01-10',
            status: 'Active',
            fileSize: '1.8 MB',
          },
          {
            id: 'doc-4',
            title: 'Star Health & Allied Insurance Cashless Network Agreement',
            category: 'Insurance',
            fileName: 'TPA_MOU_StarHealth_2024_2027.pdf',
            uploadDate: '2024-03-15',
            expiryDate: '2027-03-14',
            status: 'Active',
            fileSize: '4.5 MB',
          },
          {
            id: 'doc-5',
            title: 'Liquid Medical Oxygen (LMO) Cryogenic Tank Supply Contract',
            category: 'Contracts',
            fileName: 'LMO_Gas_Supply_Contract_Signed.pdf',
            uploadDate: '2023-11-20',
            expiryDate: '2026-11-19',
            status: 'Active',
            fileSize: '3.2 MB',
          },
          {
            id: 'doc-6',
            title: 'Clinical Standard Operating Procedures (SOP) - Emergency Triage',
            category: 'SOP',
            fileName: 'SOP_Emergency_Triage_CodeBlue_2026.pdf',
            uploadDate: '2024-02-01',
            status: 'Active',
            fileSize: '5.6 MB',
          },
          {
            id: 'doc-7',
            title: 'Hospital Infection Prevention & Antimicrobial Stewardship Policy',
            category: 'Policies',
            fileName: 'Infection_Control_Antibiotic_Policy_V3.pdf',
            uploadDate: '2024-01-28',
            status: 'Active',
            fileSize: '2.9 MB',
          },
        ];
  });

  // New item modal form states
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [newLicense, setNewLicense] = useState({
    name: '',
    regNo: '',
    issueDate: '',
    validTill: '',
    documentFile: '',
  });
  const [newDoc, setNewDoc] = useState<{
    title: string;
    category: HospitalDocument['category'];
    fileName: string;
    expiryDate: string;
  }>({
    title: '',
    category: 'Registration',
    fileName: '',
    expiryDate: '',
  });

  // Synchronize with backend API on mount
  useEffect(() => {
    api.get('/organization/profile')
      .then((res) => {
        if (res.data) {
          const data = res.data;
          setGeneralInfo((prev: any) => ({
            ...prev,
            hospitalName: data.name || prev.hospitalName,
            hospitalCode: prev.hospitalCode || 'NH-MAIN-001',
            legalName: prev.legalName,
          }));
          setContactEmails((prev: any) => ({
            ...prev,
            generalEmail: data.email || prev.generalEmail,
            website: prev.website,
          }));
          setAddressInfo((prev: any) => ({
            ...prev,
            streetAddress: data.address || prev.streetAddress,
            city: data.city || prev.city,
            state: data.state || prev.state,
            postalCode: data.postalCode || prev.postalCode,
            country: data.country || prev.country,
          }));
          setIsBackendConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Backend profile offline, using enterprise local state:', err);
      });
  }, []);

  // Persist to localStorage on change
  const saveAllStateToStorage = () => {
    localStorage.setItem('hms_profile_general', JSON.stringify(generalInfo));
    localStorage.setItem('hms_profile_contacts', JSON.stringify(contacts));
    localStorage.setItem('hms_profile_emails', JSON.stringify(contactEmails));
    localStorage.setItem('hms_profile_address', JSON.stringify(addressInfo));
    localStorage.setItem('hms_profile_branding', JSON.stringify(branding));
    localStorage.setItem('hms_profile_regulatory', JSON.stringify(regulatory));
    localStorage.setItem('hms_profile_operational', JSON.stringify(operational));
    localStorage.setItem('hms_hospital_documents', JSON.stringify(documents));
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveAllStateToStorage();

    const payload = {
      name: generalInfo.hospitalName,
      tagline: branding.logoText,
      email: contactEmails.generalEmail,
      phone: contacts.find(c => c.isPrimary)?.phone || contacts[0]?.phone,
      emergency_phone: contacts.find(c => c.name.toLowerCase().includes('emergency'))?.phone,
      address: addressInfo.streetAddress,
      city: addressInfo.city,
      state: addressInfo.state,
      postalCode: addressInfo.postalCode,
      country: addressInfo.country,
      taxId: 'TX-998822-US',
      currency: 'USD',
      timezone: operational.timezone,
      branding,
      operationalSettings: operational,
      capacity: {
        beds: generalInfo.totalBeds,
        departments: generalInfo.totalDepartments,
        doctors: generalInfo.totalDoctors,
        otRooms: generalInfo.totalOtRooms,
        icuBeds: generalInfo.totalIcuBeds,
      },
    };

    api.put('/organization/profile', payload)
      .then(() => {
        setIsBackendConnected(true);
        setSaveAlert('All profile changes synchronized to live SQLite backend & local enterprise cache.');
      })
      .catch(() => {
        setSaveAlert('Profile changes saved locally to enterprise store.');
      });

    setTimeout(() => setSaveAlert(null), 4000);
  };

  // Contact CRUD Handlers
  const handleToggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    saveAllStateToStorage();
  };

  const handleSetPrimaryContact = (id: string) => {
    setContacts(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
    saveAllStateToStorage();
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    const item: DepartmentContact = {
      id: `c-${Date.now()}`,
      name: newContact.name,
      phone: newContact.phone,
      isPrimary: false,
      active: true,
    };
    const updated = [...contacts, item];
    setContacts(updated);
    localStorage.setItem('hms_profile_contacts', JSON.stringify(updated));
    setNewContact({ name: '', phone: '' });
    setShowAddContactModal(false);
    setSaveAlert(`Added departmental contact: ${item.name}`);
    setTimeout(() => setSaveAlert(null), 3000);
  };

  // License CRUD Handlers
  const handleAddLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicense.name || !newLicense.regNo) return;
    const item: RegulatoryLicense = {
      id: `lic-${Date.now()}`,
      name: newLicense.name,
      regNo: newLicense.regNo,
      issueDate: newLicense.issueDate || new Date().toISOString().split('T')[0],
      validTill: newLicense.validTill || '2028-12-31',
      documentFile: newLicense.documentFile || `${newLicense.name.replace(/\s+/g, '_')}.pdf`,
      status: 'VALID',
    };
    const updated = [...regulatory, item];
    setRegulatory(updated);
    localStorage.setItem('hms_profile_regulatory', JSON.stringify(updated));
    setNewLicense({ name: '', regNo: '', issueDate: '', validTill: '', documentFile: '' });
    setShowAddLicenseModal(false);
    setSaveAlert(`Registered new compliance license: ${item.name}`);
    setTimeout(() => setSaveAlert(null), 3000);
  };

  const handleRenewLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenewLicenseModal) return;
    const updated = regulatory.map(item =>
      item.id === showRenewLicenseModal.id
        ? {
            ...item,
            validTill: showRenewLicenseModal.validTill,
            documentFile: showRenewLicenseModal.documentFile,
            status: 'VALID' as const,
          }
        : item,
    );
    setRegulatory(updated);
    localStorage.setItem('hms_profile_regulatory', JSON.stringify(updated));
    setShowRenewLicenseModal(null);
    setSaveAlert('License renewed successfully with updated validity and document copy.');
    setTimeout(() => setSaveAlert(null), 3000);
  };

  // Document CRUD Handlers
  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title) return;
    const doc: HospitalDocument = {
      id: `doc-${Date.now()}`,
      title: newDoc.title,
      category: newDoc.category,
      fileName: newDoc.fileName || `${newDoc.title.replace(/\s+/g, '_')}.pdf`,
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: newDoc.expiryDate || undefined,
      status: 'Active',
      fileSize: '2.1 MB',
    };
    const updated = [doc, ...documents];
    setDocuments(updated);
    localStorage.setItem('hms_hospital_documents', JSON.stringify(updated));
    setNewDoc({ title: '', category: 'Registration', fileName: '', expiryDate: '' });
    setShowUploadDocModal(false);
    setSaveAlert(`Uploaded document to repository: ${doc.title}`);
    setTimeout(() => setSaveAlert(null), 3000);
  };

  const handleArchiveDoc = (id: string) => {
    const updated = documents.map(d => (d.id === id ? { ...d, status: 'Archived' as const } : d));
    setDocuments(updated);
    localStorage.setItem('hms_hospital_documents', JSON.stringify(updated));
    setSaveAlert('Document archived.');
    setTimeout(() => setSaveAlert(null), 3000);
  };

  const filteredDocs = docCategoryFilter === 'All'
    ? documents
    : documents.filter(d => d.category === docCategoryFilter);

  // Status Badge Helper
  const getLicenseBadge = (status: RegulatoryLicense['status']) => {
    switch (status) {
      case 'VALID':
        return <span className="badge badge-success"><CheckCircle size={12} /> Valid & Compliant</span>;
      case 'EXPIRING_90':
        return <span className="badge" style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}><Clock size={12} /> Expires in 90 days</span>;
      case 'EXPIRING_60':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> Expires in 60 days</span>;
      case 'EXPIRING_30':
        return <span className="badge" style={{ backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}><AlertCircle size={12} /> Expires in 30 days</span>;
      case 'EXPIRED':
        return <span className="badge badge-danger"><AlertCircle size={12} /> Expired</span>;
    }
  };

  return (
    <div className="card">
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
              1. Hospital Profile Master Configuration
            </h3>
            {isArchived ? (
              <span className="badge badge-danger">
                <Archive size={12} /> Archived State
              </span>
            ) : (
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Active Enterprise Profile
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Hospital legal identity, capacity metrics, departmental contacts, Geo-GIS, branding templates, licenses & documents repository
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isBackendConnected && (
            <span className="badge badge-success">
              <CheckCircle size={14} /> Live SQLite Backend Synchronized
            </span>
          )}
          {saveAlert && (
            <span className="badge badge-success">
              <CheckCircle size={14} /> {saveAlert}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowHistoryModal(true)}
            title="View audit revision history"
          >
            <History size={14} /> View History
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIsArchived(!isArchived);
              setSaveAlert(isArchived ? 'Profile restored to active state.' : 'Profile archived.');
              setTimeout(() => setSaveAlert(null), 3000);
            }}
            style={{ color: isArchived ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            <Archive size={14} /> {isArchived ? 'Unarchive Profile' : 'Archive'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSaveAll()}>
            <Save size={16} /> Save All Profile Changes
          </button>
        </div>
      </div>

      {/* Profile Section Mini Navigation Bar (7 Tabs) */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
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
          <Phone size={15} /> Contact Details ({contacts.length})
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'address' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('address')}
        >
          <MapPin size={15} /> Address & Location
        </button>
        <button
          className={`subtab-pill ${activeSubSection === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('branding')}
        >
          <Image size={15} /> Branding & Documents
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
        <button
          className={`subtab-pill ${activeSubSection === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveSubSection('documents')}
          style={{ position: 'relative' }}
        >
          <FileText size={15} /> Hospital Documents ({documents.length})
          <span
            style={{
              marginLeft: '0.375rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '0.1rem 0.4rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            NEW
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. GENERAL INFORMATION TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'general' && (
        <div>
          {/* Section: Hospital Identity */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} color="var(--primary)" /> Hospital Identity
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Hospital Name</label>
                <input
                  className="form-input"
                  value={generalInfo.hospitalName}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, hospitalName: e.target.value })}
                  placeholder="e.g. North Hospital Main Campus"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital Code</label>
                <input
                  className="form-input"
                  value={generalInfo.hospitalCode}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, hospitalCode: e.target.value })}
                  placeholder="e.g. NH-MAIN-001"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Short Name</label>
                <input
                  className="form-input"
                  value={generalInfo.shortName}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, shortName: e.target.value })}
                  placeholder="e.g. North Hospital"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Legal Entity Name</label>
                <input
                  className="form-input"
                  value={generalInfo.legalName}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, legalName: e.target.value })}
                  placeholder="e.g. North Healthcare Enterprise Pvt Ltd"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Established Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={generalInfo.establishmentDate}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, establishmentDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section: Hospital Classification */}
          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} color="var(--primary)" /> Hospital Classification
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Hospital Type</label>
                <select
                  className="form-select"
                  value={generalInfo.hospitalType}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, hospitalType: e.target.value })}
                >
                  <option value="General">General Hospital</option>
                  <option value="Multi Specialty">Multi Specialty Hospital</option>
                  <option value="Super Specialty">Super Specialty Hospital</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ownership</label>
                <select
                  className="form-select"
                  value={generalInfo.ownership}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, ownership: e.target.value })}
                >
                  <option value="Private">Private Entity</option>
                  <option value="Trust">Charitable / Healthcare Trust</option>
                  <option value="Government">Government / Public Institution</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Teaching Hospital</label>
                <select
                  className="form-select"
                  value={generalInfo.teachingHospital}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, teachingHospital: e.target.value })}
                >
                  <option value="Yes">Yes (Medical College / DNB Residency Attached)</option>
                  <option value="No">No (Non-Teaching Healthcare Facility)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Capacity Information */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Activity size={16} color="var(--primary)" /> Capacity Information
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                * Core metrics informing bed occupancy algorithms, OT block booking, and nursing ratios
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  <BedDouble size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Beds</span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={generalInfo.totalBeds}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, totalBeds: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '1.125rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  <Layers size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Departments</span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={generalInfo.totalDepartments}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, totalDepartments: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '1.125rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  <Stethoscope size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Doctors</span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={generalInfo.totalDoctors}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, totalDoctors: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '1.125rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  <Scissors size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total OT Rooms</span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={generalInfo.totalOtRooms}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, totalOtRooms: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '1.125rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#dc2626' }}>
                  <Activity size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total ICU Beds</span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={generalInfo.totalIcuBeds}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, totalIcuBeds: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '1.125rem', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(true)}>
              <History size={14} /> Audit Trail
            </button>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save General Information
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONTACT DETAILS TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'contact' && (
        <div>
          {/* Departmental Contacts Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Phone size={16} color="var(--primary)" /> Departmental Contact Routing
              </h4>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddContactModal(true)}
              >
                <Plus size={14} /> Add Department Contact
              </button>
            </div>

            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Department / Service Line</th>
                    <th>Phone / Ext Helpline</th>
                    <th>Routing Status</th>
                    <th>Primary Hotline</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={c.phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContacts(prev => prev.map(item => item.id === c.id ? { ...item, phone: val } : item));
                          }}
                          style={{ maxWidth: '240px', padding: '0.35rem 0.6rem' }}
                        />
                      </td>
                      <td>
                        <span className={`badge ${c.active ? 'badge-success' : 'badge-warning'}`}>
                          {c.active ? 'Active Routing' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        {c.isPrimary ? (
                          <span className="badge badge-success" style={{ backgroundColor: '#0284c7', color: '#fff' }}>
                            <Check size={12} /> Primary Line
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSetPrimaryContact(c.id)}
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          >
                            Set Primary
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleContact(c.id)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: c.active ? 'var(--danger)' : 'var(--success)' }}
                        >
                          {c.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Departmental Emails */}
          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} color="var(--primary)" /> Departmental Official Emails
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">General Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={contactEmails.generalEmail}
                  onChange={(e) => setContactEmails({ ...contactEmails, generalEmail: e.target.value })}
                  placeholder="info@northhospital.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={contactEmails.adminEmail}
                  onChange={(e) => setContactEmails({ ...contactEmails, adminEmail: e.target.value })}
                  placeholder="admin@northhospital.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={contactEmails.billingEmail}
                  onChange={(e) => setContactEmails({ ...contactEmails, billingEmail: e.target.value })}
                  placeholder="billing@northhospital.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">HR Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={contactEmails.hrEmail}
                  onChange={(e) => setContactEmails({ ...contactEmails, hrEmail: e.target.value })}
                  placeholder="hr@northhospital.com"
                />
              </div>
            </div>
          </div>

          {/* Website & Social Platforms */}
          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={16} color="var(--primary)" /> Official Website & Social Handles
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Official Website</label>
                <input
                  className="form-input"
                  value={contactEmails.website}
                  onChange={(e) => setContactEmails({ ...contactEmails, website: e.target.value })}
                  placeholder="https://www.northhospital.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn</label>
                <input
                  className="form-input"
                  value={contactEmails.socialLinkedIn}
                  onChange={(e) => setContactEmails({ ...contactEmails, socialLinkedIn: e.target.value })}
                  placeholder="linkedin.com/company/north-hospital"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Facebook</label>
                <input
                  className="form-input"
                  value={contactEmails.socialFacebook}
                  onChange={(e) => setContactEmails({ ...contactEmails, socialFacebook: e.target.value })}
                  placeholder="facebook.com/northhospital"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Instagram</label>
                <input
                  className="form-input"
                  value={contactEmails.socialInstagram}
                  onChange={(e) => setContactEmails({ ...contactEmails, socialInstagram: e.target.value })}
                  placeholder="@northhospital_health"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Contact Details
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADDRESS & LOCATION TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'address' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} color="var(--primary)" /> Registered Physical Address
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label className="form-label">Full Street Address</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  value={addressInfo.streetAddress}
                  onChange={(e) => setAddressInfo({ ...addressInfo, streetAddress: e.target.value })}
                  placeholder="Building, street, district..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={addressInfo.city}
                  onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">State / Province</label>
                <input
                  className="form-input"
                  value={addressInfo.state}
                  onChange={(e) => setAddressInfo({ ...addressInfo, state: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postal / ZIP Code</label>
                <input
                  className="form-input"
                  value={addressInfo.postalCode}
                  onChange={(e) => setAddressInfo({ ...addressInfo, postalCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  className="form-input"
                  value={addressInfo.country}
                  onChange={(e) => setAddressInfo({ ...addressInfo, country: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* GIS Coordinates & Google Maps */}
          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={16} color="var(--primary)" /> Geographic Coordinates & Navigation
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  className="form-input"
                  value={addressInfo.latitude}
                  onChange={(e) => setAddressInfo({ ...addressInfo, latitude: e.target.value })}
                  placeholder="e.g. 40.7128° N"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  className="form-input"
                  value={addressInfo.longitude}
                  onChange={(e) => setAddressInfo({ ...addressInfo, longitude: e.target.value })}
                  placeholder="e.g. 74.0060° W"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Google Maps URL</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="form-input"
                    value={addressInfo.googleMapsUrl}
                    onChange={(e) => setAddressInfo({ ...addressInfo, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                  />
                  {addressInfo.googleMapsUrl && (
                    <a
                      href={addressInfo.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Open in Google Maps"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Coverage Radius */}
          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="#dc2626" /> Emergency & Ambulance Coverage
            </h4>
            <div style={{ maxWidth: '420px' }}>
              <div className="form-group">
                <label className="form-label">Coverage Radius (KM)</label>
                <input
                  className="form-input"
                  value={addressInfo.coverageRadiusKm}
                  onChange={(e) => setAddressInfo({ ...addressInfo, coverageRadiusKm: e.target.value })}
                  placeholder="e.g. 15 KM"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Defines the primary emergency ambulance dispatch zone, rapid-response geo-fencing, and trauma pickup boundaries.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAddressInfo({
                  ...addressInfo,
                  latitude: '40.7128° N',
                  longitude: '74.0060° W',
                  googleMapsUrl: 'https://maps.google.com/?q=40.7128,-74.0060',
                });
                setSaveAlert('Coordinates updated from GPS pin.');
                setTimeout(() => setSaveAlert(null), 3000);
              }}
            >
              Update Coordinates from GPS
            </button>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Address & Location
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BRANDING & DOCUMENTS TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'branding' && (
        <div>
          {/* Branding Assets Grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Image size={16} color="var(--primary)" /> Hospital Branding Assets
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {/* Asset 1: Hospital Logo */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Building2 size={24} />
                </div>
                <strong style={{ fontSize: '0.875rem' }}>Hospital Logo</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
                  Primary high-res vector for portal header & reports
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    <Upload size={13} /> Upload / Replace
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={() => {
                        setSaveAlert('Uploaded new Hospital Logo asset.');
                        setTimeout(() => setSaveAlert(null), 3000);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Asset 2: Hospital Seal */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Award size={24} />
                </div>
                <strong style={{ fontSize: '0.875rem' }}>Hospital Seal</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
                  Official circular embossing for discharge & legal deeds
                </p>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> {branding.hasSeal ? 'Replace Seal' : 'Upload Seal'}
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={() => {
                      setBranding({ ...branding, hasSeal: true });
                      setSaveAlert('Official Hospital Seal updated.');
                      setTimeout(() => setSaveAlert(null), 3000);
                    }}
                  />
                </label>
              </div>

              {/* Asset 3: Hospital Stamp */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <FileCheck size={24} />
                </div>
                <strong style={{ fontSize: '0.875rem' }}>Hospital Stamp</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
                  Authorized cashier & pharmacy dispensary verification
                </p>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> {branding.hasStamp ? 'Replace Stamp' : 'Upload Stamp'}
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={() => {
                      setBranding({ ...branding, hasStamp: true });
                      setSaveAlert('Hospital Stamp asset updated.');
                      setTimeout(() => setSaveAlert(null), 3000);
                    }}
                  />
                </label>
              </div>

              {/* Asset 4: Digital Signature */}
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Edit2 size={24} />
                </div>
                <strong style={{ fontSize: '0.875rem' }}>Digital Signature</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
                  Authorized medical superintendent signature key
                </p>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> {branding.hasDigitalSignature ? 'Replace Key' : 'Upload Signature'}
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={() => {
                      setBranding({ ...branding, hasDigitalSignature: true });
                      setSaveAlert('Digital signature cryptographic certificate uploaded.');
                      setTimeout(() => setSaveAlert(null), 3000);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Document Templates & Print Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--primary)" /> Document Templates Configuration
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Template 1: Prescription */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.8125rem' }}>Prescription Template</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Current: Digital QR / Barcode Layout
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewTemplate({ isOpen: true, type: 'prescription' })}
                    >
                      <Eye size={13} /> Preview Template
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSaveAlert('Published Prescription Template as system default.');
                        setTimeout(() => setSaveAlert(null), 3000);
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>

                {/* Template 2: Invoice */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.8125rem' }}>Invoice & Billing Template</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Current: Standard A4 Itemized GST Tax Bill
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewTemplate({ isOpen: true, type: 'invoice' })}
                    >
                      <Eye size={13} /> Preview Template
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSaveAlert('Published Invoice Template as system default.');
                        setTimeout(() => setSaveAlert(null), 3000);
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>

                {/* Template 3: Lab Report */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.8125rem' }}>Lab & Pathology Report Template</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Current: NABL Accredited 2-Column Normal Range Matrix
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewTemplate({ isOpen: true, type: 'lab' })}
                    >
                      <Eye size={13} /> Preview Template
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSaveAlert('Published Pathology Report Template as system default.');
                        setTimeout(() => setSaveAlert(null), 3000);
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>

                {/* Template 4: Discharge Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.8125rem' }}>Discharge Summary Template</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Current: Comprehensive IPD Clinical Summary
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewTemplate({ isOpen: true, type: 'discharge' })}
                    >
                      <Eye size={13} /> Preview Template
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSaveAlert('Published Discharge Summary Template as system default.');
                        setTimeout(() => setSaveAlert(null), 3000);
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Settings */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} color="var(--primary)" /> Global Print Settings
              </h4>
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Default Paper Print Size</label>
                  <select
                    className="form-select"
                    value={branding.paperSize}
                    onChange={(e) => setBranding({ ...branding, paperSize: e.target.value })}
                  >
                    <option value="A4">A4 (Standard Sheet - 210 x 297 mm)</option>
                    <option value="Thermal">Thermal (80mm POS Roll for Cashier Counter)</option>
                    <option value="Letterhead">Letterhead (Pre-Printed Top Header 45mm Margin)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Branding Tagline</label>
                  <input
                    className="form-input"
                    value={branding.logoText}
                    onChange={(e) => setBranding({ ...branding, logoText: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Letterhead Header Text</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={branding.letterheadHeader}
                    onChange={(e) => setBranding({ ...branding, letterheadHeader: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Branding & Documents
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REGULATORY & LICENSES TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'regulatory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ShieldCheck size={16} color="var(--primary)" /> Regulatory Compliance & Clinical Accreditation Licenses
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Monitors mandatory health department permits, environmental clearances, and audit renewals with proactive expiry alarms
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddLicenseModal(true)}
            >
              <Plus size={14} /> Add New License
            </button>
          </div>

          {/* Expiry Alarm Summary Badges */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">
              <CheckCircle size={13} /> {regulatory.filter(r => r.status === 'VALID').length} Valid
            </span>
            <span className="badge" style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>
              <Clock size={13} /> {regulatory.filter(r => r.status === 'EXPIRING_90').length} Expiring in 90 Days
            </span>
            <span className="badge badge-warning">
              <AlertTriangle size={13} /> {regulatory.filter(r => r.status === 'EXPIRING_60').length} Expiring in 60 Days
            </span>
            <span className="badge" style={{ backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>
              <AlertCircle size={13} /> {regulatory.filter(r => r.status === 'EXPIRING_30').length} Expiring in 30 Days
            </span>
            <span className="badge badge-danger">
              <AlertCircle size={13} /> {regulatory.filter(r => r.status === 'EXPIRED').length} Expired
            </span>
          </div>

          <div className="table-container" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Compliance / License Certificate</th>
                  <th>License Number</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Document PDF</th>
                  <th>Status & Alert</th>
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
                    <td><span style={{ fontSize: '0.8125rem' }}>{item.issueDate}</span></td>
                    <td><strong style={{ fontSize: '0.8125rem' }}>{item.validTill}</strong></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#0284c7' }}>
                        <FileText size={13} /> {item.documentFile}
                      </span>
                    </td>
                    <td>{getLicenseBadge(item.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowRenewLicenseModal(item)}
                        style={{ marginRight: '0.375rem' }}
                      >
                        <Upload size={12} /> Renew / Upload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Licenses Data
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OPERATIONAL SETTINGS TAB */}
      {/* ========================================================================= */}
      {activeSubSection === 'operational' && (
        <div>
          {/* Time Settings */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--primary)" /> Time & Working Shifts Settings
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">System Timezone</label>
                <input
                  className="form-input"
                  value={operational.timezone}
                  onChange={(e) => setOperational({ ...operational, timezone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Calendar Week Start Day</label>
                <select
                  className="form-select"
                  value={operational.weekStartDay}
                  onChange={(e) => setOperational({ ...operational, weekStartDay: e.target.value })}
                >
                  <option value="Monday">Monday (Standard)</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fiscal Year Accounting Cycle</label>
                <select
                  className="form-select"
                  value={operational.fiscalYear}
                  onChange={(e) => setOperational({ ...operational, fiscalYear: e.target.value })}
                >
                  <option value="April - March (Standard Fiscal)">April - March (Standard Fiscal Cycle)</option>
                  <option value="January - December (Calendar Year)">January - December (Calendar Year)</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label className="form-label">Working Days & Shifts</label>
                <input
                  className="form-input"
                  value={operational.workingDays}
                  onChange={(e) => setOperational({ ...operational, workingDays: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Patient, Appointment, Admission & Billing Rules */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} color="var(--primary)" /> Patient, Clinical & Financial Rules
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {/* Patient Settings: UHID Prefix */}
              <div className="form-group">
                <label className="form-label">UHID Patient ID Prefix</label>
                <input
                  className="form-input"
                  value={operational.uhidPrefix}
                  onChange={(e) => setOperational({ ...operational, uhidPrefix: e.target.value })}
                  placeholder="e.g. PAT-000001 or NH-PAT-"
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Auto-increments every new patient registration (e.g. PAT-000001, PAT-000002)
                </p>
              </div>

              {/* Appointment Duration */}
              <div className="form-group">
                <label className="form-label">Default Appointment Duration</label>
                <select
                  className="form-select"
                  value={operational.appointmentDuration}
                  onChange={(e) => setOperational({ ...operational, appointmentDuration: e.target.value })}
                >
                  <option value="15 min">15 min (Express OPD / Follow-up)</option>
                  <option value="20 min">20 min (Standard Consultation)</option>
                  <option value="30 min">30 min (Super Specialty / Detailed Workup)</option>
                  <option value="45 min">45 min (Comprehensive Psychiatric / Neuro)</option>
                </select>
              </div>

              {/* Walk-in Allowed */}
              <div className="form-group">
                <label className="form-label">Walk-In Patients Allowed in OPD</label>
                <select
                  className="form-select"
                  value={operational.walkInAllowed}
                  onChange={(e) => setOperational({ ...operational, walkInAllowed: e.target.value })}
                >
                  <option value="Yes">Yes (Reception can issue Instant Token)</option>
                  <option value="No">No (Prior Booking Strictly Required)</option>
                </select>
              </div>

              {/* Require Deposit */}
              <div className="form-group">
                <label className="form-label">Require Initial Deposit for IPD Admission</label>
                <select
                  className="form-select"
                  value={operational.requireDeposit}
                  onChange={(e) => setOperational({ ...operational, requireDeposit: e.target.value })}
                >
                  <option value="Yes">Yes (Mandatory Advance Deposit Receipt)</option>
                  <option value="No">No (Post-Discharge Settlement Allowed)</option>
                </select>
              </div>

              {/* Auto Bed Assignment */}
              <div className="form-group">
                <label className="form-label">Auto Bed Assignment on Admission</label>
                <select
                  className="form-select"
                  value={operational.autoBedAssignment}
                  onChange={(e) => setOperational({ ...operational, autoBedAssignment: e.target.value })}
                >
                  <option value="No">No (Manual Ward Manager Selection - Recommended)</option>
                  <option value="Yes">Yes (Algorithm assigns next available bed)</option>
                </select>
              </div>

              {/* GST / Tax Enabled */}
              <div className="form-group">
                <label className="form-label">GST / Tax Invoicing Enabled</label>
                <select
                  className="form-select"
                  value={operational.gstEnabled}
                  onChange={(e) => setOperational({ ...operational, gstEnabled: e.target.value })}
                >
                  <option value="Yes">Yes (Generate itemized GST / Tax Breakdown)</option>
                  <option value="No">No (Tax-Exempt Medical Services)</option>
                </select>
              </div>

              {/* Discount Approval Required */}
              <div className="form-group">
                <label className="form-label">Discount Approval Required</label>
                <select
                  className="form-select"
                  value={operational.discountApprovalRequired}
                  onChange={(e) => setOperational({ ...operational, discountApprovalRequired: e.target.value })}
                >
                  <option value="Yes">Yes (Requires Admin / Finance Manager OTP sign-off)</option>
                  <option value="No">No (Cashier can grant discretionary discount)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOperational({
                  timezone: 'America/New_York (EST / UTC-5)',
                  workingDays: '24/7 (Emergency & IPD) | OPD: Mon - Sat (08:00 - 20:00)',
                  weekStartDay: 'Monday',
                  fiscalYear: 'April - March (Standard Fiscal)',
                  uhidPrefix: 'PAT-000001',
                  appointmentDuration: '20 min',
                  walkInAllowed: 'Yes',
                  requireDeposit: 'Yes',
                  autoBedAssignment: 'No',
                  gstEnabled: 'Yes',
                  discountApprovalRequired: 'Yes',
                });
                setSaveAlert('Reset operational rules to hospital baseline defaults.');
                setTimeout(() => setSaveAlert(null), 3000);
              }}
            >
              Reset System Defaults
            </button>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Operational Settings
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. HOSPITAL DOCUMENTS TAB (NEW CENTRAL REPOSITORY) */}
      {/* ========================================================================= */}
      {activeSubSection === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <FileText size={16} color="var(--primary)" /> Central Hospital Documents & Legal Deeds Repository
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Secure central storage for hospital registration, NABH dossiers, Fire NOCs, vendor contracts, insurance MOUs & medical policies
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowUploadDocModal(true)}
            >
              <Upload size={14} /> Upload New Document
            </button>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {['All', 'Registration', 'NABH', 'Fire NOC', 'Insurance', 'Contracts', 'SOP', 'Policies'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${docCategoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDocCategoryFilter(cat)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                {cat} {cat === 'All' ? `(${documents.length})` : `(${documents.filter(d => d.category === cat).length})`}
              </button>
            ))}
          </div>

          {/* Document Table */}
          <div className="table-container" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Category</th>
                  <th>File Name & Size</th>
                  <th>Uploaded Date</th>
                  <th>Expiry / Review</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} color="var(--primary)" />
                        <strong>{doc.title}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {doc.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>{doc.fileName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({doc.fileSize})</span>
                    </td>
                    <td><span style={{ fontSize: '0.8125rem' }}>{doc.uploadDate}</span></td>
                    <td><span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{doc.expiryDate || 'N/A (Permanent)'}</span></td>
                    <td>
                      <span className={`badge ${doc.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSaveAlert(`Downloading: ${doc.fileName}`);
                            setTimeout(() => setSaveAlert(null), 2500);
                          }}
                          title="Download File"
                        >
                          <Download size={13} />
                        </button>
                        {doc.status !== 'Archived' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleArchiveDoc(doc.id)}
                            style={{ color: 'var(--text-muted)' }}
                            title="Archive"
                          >
                            <Archive size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-primary" onClick={() => handleSaveAll()}>
              <Save size={15} /> Save Document Registry
            </button>
          </div>
        </div>
      )}

      {/* Permissions / Responsible Roles Banner */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong>Governing Roles:</strong> Hospital Owner, Hospital Director, Compliance Manager, IT Administrator
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong>Authorized Actions:</strong> View/Edit Profile, Upload Branding, Manage Licenses, Configure Settings, Manage Legal Deeds
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CONTACT MODAL */}
      {/* ========================================================================= */}
      {showAddContactModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Department Contact</h4>
              <button onClick={() => setShowAddContactModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddContactSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Department / Counter Name</label>
                <input
                  className="form-input"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Pharmacy Counter Line"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Direct Phone / Ext Number</label>
                <input
                  className="form-input"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+1 (555) 019-XXXX"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddContactModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14} /> Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD LICENSE MODAL */}
      {/* ========================================================================= */}
      {showAddLicenseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Register New License Certificate</h4>
              <button onClick={() => setShowAddLicenseModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLicenseSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Certificate / License Name</label>
                <input
                  className="form-input"
                  value={newLicense.name}
                  onChange={(e) => setNewLicense({ ...newLicense, name: e.target.value })}
                  placeholder="e.g. Atomic Energy Regulatory Board (AERB) X-Ray License"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Registration / License Number</label>
                <input
                  className="form-input"
                  value={newLicense.regNo}
                  onChange={(e) => setNewLicense({ ...newLicense, regNo: e.target.value })}
                  placeholder="e.g. AERB-MED-2026-99"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newLicense.issueDate}
                    onChange={(e) => setNewLicense({ ...newLicense, issueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newLicense.validTill}
                    onChange={(e) => setNewLicense({ ...newLicense, validTill: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Attach Scanned PDF Copy</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewLicense({ ...newLicense, documentFile: file.name });
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddLicenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><ShieldCheck size={14} /> Register License</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RENEW LICENSE MODAL */}
      {/* ========================================================================= */}
      {showRenewLicenseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Renew License & Upload New Copy</h4>
              <button onClick={() => setShowRenewLicenseModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Renewing: <strong>{showRenewLicenseModal.name}</strong> (<code>{showRenewLicenseModal.regNo}</code>)
            </p>
            <form onSubmit={handleRenewLicenseSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">New Valid Till / Expiry Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={showRenewLicenseModal.validTill}
                  onChange={(e) => setShowRenewLicenseModal({ ...showRenewLicenseModal, validTill: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Upload Renewed PDF Certificate</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setShowRenewLicenseModal({ ...showRenewLicenseModal, documentFile: file.name });
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRenewLicenseModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Upload size={14} /> Submit Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: UPLOAD DOCUMENT TO REPOSITORY */}
      {/* ========================================================================= */}
      {showUploadDocModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Upload Central Hospital Document</h4>
              <button onClick={() => setShowUploadDocModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadDocSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Document Title</label>
                <input
                  className="form-input"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="e.g. Biomedical Waste Management MOU with Agency"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as any })}
                >
                  <option value="Registration">Hospital Registration</option>
                  <option value="NABH">NABH Documents</option>
                  <option value="Fire NOC">Fire NOC</option>
                  <option value="Insurance">Insurance Agreements</option>
                  <option value="Contracts">Vendor Contracts</option>
                  <option value="SOP">SOP Documents</option>
                  <option value="Policies">Hospital Policies</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Expiry / Review Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDoc.expiryDate}
                  onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Select Document (PDF/DOCX)</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewDoc({ ...newDoc, fileName: file.name });
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadDocModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Upload size={14} /> Upload Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AUDIT HISTORY MODAL */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '560px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="var(--primary)" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Profile Configuration Audit Log</h4>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>v2.0 Enterprise Profile Revamp</strong>
                  <span style={{ color: 'var(--text-muted)' }}>16-Sep-2026 16:20</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Added Capacity metrics, Departmental contact routing, GIS Coverage Radius (15 KM), Document Templates, and Central Documents Repository.
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Authorized by: Harsh Director (HOSPITAL_ADMIN)</span>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>v1.2 Regulatory Accreditation Update</strong>
                  <span style={{ color: 'var(--text-muted)' }}>10-Aug-2026 11:30</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  NABH 5th Edition Gold Standard certification validity renewed until 30-Jun-2028.
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Authorized by: Compliance Officer</span>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>v1.0 Initial Master Setup</strong>
                  <span style={{ color: 'var(--text-muted)' }}>18-Apr-2024 09:00</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Initial hospital creation with clinical registration HOSP-2024-REG-98214 and 250 bed baseline capacity.
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>System Seed</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      <DocumentPreviewModal
        isOpen={previewTemplate.isOpen}
        onClose={() => setPreviewTemplate({ ...previewTemplate, isOpen: false })}
        templateType={previewTemplate.type}
        hospitalName={generalInfo.hospitalName}
        hospitalAddress={`${addressInfo.streetAddress}, ${addressInfo.city}, ${addressInfo.state} ${addressInfo.postalCode}`}
        hospitalPhone={contacts.find(c => c.isPrimary)?.phone || contacts[0]?.phone}
        hospitalEmail={contactEmails.generalEmail}
        logoText={branding.logoText}
        printFormat={branding.paperSize}
      />
    </div>
  );
};
