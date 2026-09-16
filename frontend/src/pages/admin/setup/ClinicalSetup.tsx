import React, { useState } from 'react';
import {
  Sparkles,
  Activity,
  FileCode2,
  FileText,
  FileCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  BookOpen,
} from 'lucide-react';

export const ClinicalSetup: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'specialties' | 'procedures' | 'icdCodes' | 'templates' | 'consentForms'
  >('specialties');

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  // Specialties
  const [specialties, setSpecialties] = useState([
    { id: '1', code: 'SPEC-CARD', name: 'Cardiology', dept: 'Cardiology & CathLab', doctors: 3, status: 'ACTIVE' },
    { id: '2', code: 'SPEC-ORTHO', name: 'Orthopedic Surgery', dept: 'Orthopedics & Joint Care', doctors: 2, status: 'ACTIVE' },
    { id: '3', code: 'SPEC-INTMED', name: 'Internal Medicine', dept: 'General Medicine', doctors: 6, status: 'ACTIVE' },
    { id: '4', code: 'SPEC-PED', name: 'Pediatrics & Neonatology', dept: 'Pediatric Care', doctors: 2, status: 'ACTIVE' },
    { id: '5', code: 'SPEC-DERM', name: 'Dermatology', dept: 'General OPD', doctors: 1, status: 'ACTIVE' },
    { id: '6', code: 'SPEC-NEURO', name: 'Neurology & Neurosurgery', dept: 'Neurology Unit', doctors: 2, status: 'ACTIVE' },
  ]);

  // Procedures
  const [procedures, setProcedures] = useState([
    { id: '1', code: 'PROC-93000', name: '12-Lead Electrocardiogram (ECG)', dept: 'Cardiology', duration: '15 mins', fee: '$45.00', status: 'ACTIVE' },
    { id: '2', code: 'PROC-93306', name: '2D Echocardiography with Doppler', dept: 'Cardiology', duration: '30 mins', fee: '$220.00', status: 'ACTIVE' },
    { id: '3', code: 'PROC-12001', name: 'Minor Wound Debridement & Suturing', dept: 'Emergency', duration: '25 mins', fee: '$95.00', status: 'ACTIVE' },
    { id: '4', code: 'PROC-47562', name: 'Laparoscopic Cholecystectomy', dept: 'Surgery', duration: '90 mins', fee: '$2,400.00', status: 'ACTIVE' },
    { id: '5', code: 'PROC-27447', name: 'Total Knee Arthroplasty (Replacement)', dept: 'Orthopedics', duration: '120 mins', fee: '$4,800.00', status: 'ACTIVE' },
  ]);

  // ICD-10 Codes
  const [icdCodes, setIcdCodes] = useState([
    { id: '1', code: 'I10', desc: 'Essential (primary) hypertension', category: 'Circulatory System', chapter: 'Chapter IX' },
    { id: '2', code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', category: 'Endocrine & Metabolic', chapter: 'Chapter IV' },
    { id: '3', code: 'J06.9', desc: 'Acute upper respiratory infection, unspecified', category: 'Respiratory System', chapter: 'Chapter X' },
    { id: '4', code: 'A09.0', desc: 'Other and unspecified gastroenteritis of infectious origin', category: 'Infectious Diseases', chapter: 'Chapter I' },
    { id: '5', code: 'M25.561', desc: 'Pain in right knee joint', category: 'Musculoskeletal', chapter: 'Chapter XIII' },
    { id: '6', code: 'K21.9', desc: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive System', chapter: 'Chapter XI' },
  ]);

  // Clinical Templates
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Standard Adult OPD SOAP Note', type: 'Clinical Consultation', specialty: 'General Medicine', author: 'Dr. Sarah Jenkins' },
    { id: '2', name: 'Post-Operative Cardiac Recovery Note', type: 'IPD Progress Note', specialty: 'Cardiology', author: 'Dr. Robert Vance' },
    { id: '3', name: 'Comprehensive Hospital Discharge Summary', type: 'Discharge Summary', specialty: 'All Specialties', author: 'Clinical Board' },
    { id: '4', name: 'Diabetic Foot Clinical Examination', type: 'Specialty Assessment', specialty: 'Endocrinology', author: 'Dr. Emily Thorne' },
  ]);

  // Consent Forms
  const [consentForms, setConsentForms] = useState([
    { id: '1', name: 'Inpatient Hospital Admission & General Treatment Consent', scope: 'General Admission', version: 'v3.2', mandatorySignatures: 'Patient / Guardian' },
    { id: '2', name: 'Informed Surgical Procedure & Anesthesia Consent', scope: 'Surgical OT', version: 'v4.0', mandatorySignatures: 'Surgeon, Anesthetist, Patient' },
    { id: '3', name: 'Emergency Blood Product Transfusion Consent', scope: 'Critical Care / ER', version: 'v2.1', mandatorySignatures: 'Physician, Attendant' },
    { id: '4', name: 'High-Risk Diagnostic Contrast & CT/MRI Consent', scope: 'Radiology', version: 'v1.8', mandatorySignatures: 'Radiologist, Patient' },
  ]);

  const handleOpenAddModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    if (modalType === 'specialty') {
      setSpecialties([...specialties, { ...formData, id, doctors: 0, status: 'ACTIVE' }]);
    } else if (modalType === 'procedure') {
      setProcedures([...procedures, { ...formData, id, status: 'ACTIVE' }]);
    } else if (modalType === 'icd') {
      setIcdCodes([...icdCodes, { ...formData, id }]);
    } else if (modalType === 'template') {
      setTemplates([...templates, { ...formData, id, author: 'Admin' }]);
    } else if (modalType === 'consent') {
      setConsentForms([...consentForms, { ...formData, id, version: 'v1.0' }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (type: string, id: string) => {
    if (type === 'specialty') setSpecialties(specialties.filter(s => s.id !== id));
    if (type === 'procedure') setProcedures(procedures.filter(p => p.id !== id));
    if (type === 'icd') setIcdCodes(icdCodes.filter(c => c.id !== id));
    if (type === 'template') setTemplates(templates.filter(t => t.id !== id));
    if (type === 'consent') setConsentForms(consentForms.filter(f => f.id !== id));
  };

  return (
    <div>
      {/* Subtabs Pill Bar */}
      <div className="subtab-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`subtab-pill ${activeSubTab === 'specialties' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('specialties')}
        >
          <Sparkles size={16} /> Specialties ({specialties.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'procedures' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('procedures')}
        >
          <Activity size={16} /> Procedures ({procedures.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'icdCodes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('icdCodes')}
        >
          <BookOpen size={16} /> ICD-10 Library ({icdCodes.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('templates')}
        >
          <FileText size={16} /> Clinical Templates ({templates.length})
        </button>
        <button
          className={`subtab-pill ${activeSubTab === 'consentForms' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('consentForms')}
        >
          <FileCheck size={16} /> Consent Forms ({consentForms.length})
        </button>
      </div>

      {/* 1. Specialties */}
      {activeSubTab === 'specialties' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('specialty')}>
              <Plus size={16} /> + Add Specialty
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Clinical Specialty Name</th>
                  <th>Department Mapping</th>
                  <th>Doctors Assigned</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {specialties
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((spec) => (
                    <tr key={spec.id}>
                      <td><strong>{spec.code}</strong></td>
                      <td><strong>{spec.name}</strong></td>
                      <td>{spec.dept}</td>
                      <td><span className="badge badge-info">{spec.doctors} Active Docs</span></td>
                      <td><span className="badge badge-success">{spec.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('specialty', spec.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Procedures */}
      {activeSubTab === 'procedures' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search procedures by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('procedure')}>
              <Plus size={16} /> + Add Medical Procedure
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>CPT / Code</th>
                  <th>Procedure Name</th>
                  <th>Department</th>
                  <th>Est. Duration</th>
                  <th>Standard Base Fee</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {procedures
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((proc) => (
                    <tr key={proc.id}>
                      <td><code>{proc.code}</code></td>
                      <td><strong>{proc.name}</strong></td>
                      <td>{proc.dept}</td>
                      <td>{proc.duration}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--teal)' }}>{proc.fee}</span></td>
                      <td><span className="badge badge-success">{proc.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('procedure', proc.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ICD Codes */}
      {activeSubTab === 'icdCodes' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search ICD-10 diagnosis code or term..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('icd')}>
              <Plus size={16} /> + Add ICD-10 Code
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ICD-10 Code</th>
                  <th>Condition / Disease Description</th>
                  <th>Diagnostic Category</th>
                  <th>WHO Chapter</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {icdCodes
                  .filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((icd) => (
                    <tr key={icd.id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{icd.code}</strong></td>
                      <td>{icd.desc}</td>
                      <td><span className="badge badge-secondary">{icd.category}</span></td>
                      <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{icd.chapter}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('icd', icd.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Templates */}
      {activeSubTab === 'templates' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('template')}>
              <Plus size={16} /> + Create Clinical Template
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Clinical Category</th>
                  <th>Specialty Target</th>
                  <th>Created / Supervised By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates
                  .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tpl) => (
                    <tr key={tpl.id}>
                      <td><strong>{tpl.name}</strong></td>
                      <td><span className="badge badge-info">{tpl.type}</span></td>
                      <td>{tpl.specialty}</td>
                      <td>{tpl.author}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('template', tpl.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Consent Forms */}
      {activeSubTab === 'consentForms' && (
        <div>
          <div className="filter-bar">
            <div className="search-input-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder="Search consent forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('consent')}>
              <Plus size={16} /> + Upload Consent Form
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Consent Document Title</th>
                  <th>Clinical Scope</th>
                  <th>Current Version</th>
                  <th>Mandatory Signatures</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consentForms
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((form) => (
                    <tr key={form.id}>
                      <td><strong>{form.name}</strong></td>
                      <td><span className="badge badge-secondary">{form.scope}</span></td>
                      <td><code>{form.version}</code></td>
                      <td><span style={{ fontSize: '0.8125rem' }}>{form.mandatorySignatures}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          <button className="action-btn edit" title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn delete" onClick={() => handleDelete('consent', form.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generic Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add {modalType.toUpperCase()} Definition</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalType === 'specialty' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Specialty Code</label>
                    <input className="form-input" placeholder="e.g. SPEC-ENT" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialty Name</label>
                    <input className="form-input" placeholder="e.g. ENT & Otorhinolaryngology" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department Mapping</label>
                    <input className="form-input" placeholder="e.g. Surgical OPD" onChange={(e) => setFormData({ ...formData, dept: e.target.value })} required />
                  </div>
                </>
              )}

              {modalType === 'procedure' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Procedure Code (CPT)</label>
                    <input className="form-input" placeholder="e.g. PROC-31231" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Procedure Name</label>
                    <input className="form-input" placeholder="e.g. Diagnostic Nasal Endoscopy" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="e.g. ENT OPD" onChange={(e) => setFormData({ ...formData, dept: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Standard Duration</label>
                    <input className="form-input" placeholder="e.g. 20 mins" onChange={(e) => setFormData({ ...formData, duration: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Fee</label>
                    <input className="form-input" placeholder="e.g. $150.00" onChange={(e) => setFormData({ ...formData, fee: e.target.value })} required />
                  </div>
                </>
              )}

              {modalType === 'icd' && (
                <>
                  <div className="form-group">
                    <label className="form-label">ICD-10 Code</label>
                    <input className="form-input" placeholder="e.g. H66.90" onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition / Description</label>
                    <input className="form-input" placeholder="e.g. Otitis media, unspecified" onChange={(e) => setFormData({ ...formData, desc: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diagnostic Category</label>
                    <input className="form-input" placeholder="e.g. Diseases of the Ear" onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
                  </div>
                </>
              )}

              {modalType === 'template' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Template Name</label>
                    <input className="form-input" placeholder="e.g. Pediatric Vaccination Follow-up" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-input" placeholder="e.g. OPD Consultation" onChange={(e) => setFormData({ ...formData, type: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <input className="form-input" placeholder="e.g. Pediatrics" onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} required />
                  </div>
                </>
              )}

              {modalType === 'consent' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Form Title</label>
                    <input className="form-input" placeholder="e.g. Chemotherapy Treatment Consent" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clinical Scope</label>
                    <input className="form-input" placeholder="e.g. Oncology Daycare" onChange={(e) => setFormData({ ...formData, scope: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Signatures Required</label>
                    <input className="form-input" placeholder="e.g. Oncologist, Patient, Witness" onChange={(e) => setFormData({ ...formData, mandatorySignatures: e.target.value })} required />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Clinical Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
