import React from 'react';
import { X, Printer, Download, CheckCircle, FileText, QrCode } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: 'prescription' | 'invoice' | 'lab' | 'discharge';
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalEmail: string;
  logoText?: string;
  printFormat?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  templateType,
  hospitalName,
  hospitalAddress,
  hospitalPhone,
  hospitalEmail,
  logoText,
  printFormat = 'A4',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTitle = () => {
    switch (templateType) {
      case 'prescription':
        return 'Doctor E-Prescription (Rx) Template Preview';
      case 'invoice':
        return 'Tax Invoice & Billing Template Preview';
      case 'lab':
        return 'NABL Accredited Pathology Report Preview';
      case 'discharge':
        return 'Inpatient Discharge Summary Preview';
      default:
        return 'Document Template Preview';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {getTitle()}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Print Setting: <strong>{printFormat}</strong> • Master Branding Applied
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.4rem',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div
          style={{
            padding: '2rem',
            overflowY: 'auto',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '720px',
              minHeight: '620px',
              padding: '2.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#1e293b',
              fontSize: '0.875rem',
            }}
          >
            {/* Header / Letterhead */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0284c7',
                paddingBottom: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: '#0369a1' }}>
                  {hospitalName || 'North Hospital Main Campus'}
                </h1>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {logoText || 'Center for Clinical Excellence & Patient Care'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem', maxWidth: '360px' }}>
                  {hospitalAddress} • Helpline: {hospitalPhone} • Email: {hospitalEmail}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '4px',
                    color: '#166534',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  NABH ACCREDITED
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Emergency: <strong>24/7 Helpline 911</strong>
                </div>
              </div>
            </div>

            {/* Template Specific Bodies */}
            {templateType === 'prescription' && (
              <div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div><strong>Patient:</strong> Vikram Sharma</div>
                  <div><strong>Age/Gender:</strong> 42 Yrs / Male</div>
                  <div><strong>UHID:</strong> PAT-000412</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Doctor:</strong> Dr. Sarah Jenkins</div>
                  <div><strong>Department:</strong> Cardiology OPD</div>
                  <div><strong>Room:</strong> OPD-204</div>
                  <div><strong>BP/Pulse:</strong> 128/82 • 74 bpm</div>
                </div>

                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.5rem' }}>
                  ℞
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Medication & Strength</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Dosage (M-A-N)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Duration</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>1</td>
                      <td style={{ padding: '0.5rem' }}><strong>Telmisartan 40mg</strong> (Tab)</td>
                      <td style={{ padding: '0.5rem' }}>1 - 0 - 0</td>
                      <td style={{ padding: '0.5rem' }}>30 Days</td>
                      <td style={{ padding: '0.5rem' }}>After breakfast</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>2</td>
                      <td style={{ padding: '0.5rem' }}><strong>Atorvastatin 10mg</strong> (Tab)</td>
                      <td style={{ padding: '0.5rem' }}>0 - 0 - 1</td>
                      <td style={{ padding: '0.5rem' }}>30 Days</td>
                      <td style={{ padding: '0.5rem' }}>At bedtime</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>3</td>
                      <td style={{ padding: '0.5rem' }}><strong>Pantoprazole 40mg</strong> (Cap)</td>
                      <td style={{ padding: '0.5rem' }}>1 - 0 - 0</td>
                      <td style={{ padding: '0.5rem' }}>14 Days</td>
                      <td style={{ padding: '0.5rem' }}>Empty stomach in morning</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                  <strong>Doctor Advice:</strong> Low salt diet, 30 min brisk walk daily. Review after 4 weeks with lipid profile.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                    <QrCode size={36} />
                    <span>Scan QR to verify prescription & download digital copy</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '160px', marginBottom: '0.25rem' }}></div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Dr. Sarah Jenkins</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Reg No. MCI-89214 • Consultant</div>
                  </div>
                </div>
              </div>
            )}

            {templateType === 'invoice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                  <div>
                    <div><strong>Bill To:</strong> Vikram Sharma (UHID: PAT-000412)</div>
                    <div>Phone: +1 (555) 392-1084</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><strong>Invoice No:</strong> INV-2026-00892</div>
                    <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                    <div><strong>Payment:</strong> PAID (UPI / Card)</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Rate ($)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Cardiology Specialist Consultation</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>150.00</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>150.00</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>12-Lead Electrocardiogram (ECG)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>45.00</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>45.00</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Complete Blood Count (CBC) Panel</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>35.00</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>35.00</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                  <div style={{ width: '220px', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                      <span>Subtotal:</span>
                      <strong>$230.00</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                      <span>GST / Tax (5%):</span>
                      <span>$11.50</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0',
                        borderTop: '1px solid #cbd5e1',
                        fontSize: '1rem',
                        color: '#0369a1',
                      }}
                    >
                      <strong>Total Amount:</strong>
                      <strong>$241.50</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Computer generated tax invoice. Thank you for choosing North Hospital.
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '150px', marginBottom: '0.25rem' }}></div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Cashier Desk</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Authorized Hospital Seal</div>
                  </div>
                </div>
              </div>
            )}

            {templateType === 'lab' && (
              <div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div><strong>Patient:</strong> Vikram Sharma</div>
                  <div><strong>UHID:</strong> PAT-000412</div>
                  <div><strong>Sample No:</strong> SMP-98214</div>
                  <div><strong>Specimen:</strong> Whole Blood (EDTA)</div>
                  <div><strong>Ref By:</strong> Dr. Sarah Jenkins</div>
                  <div><strong>Collected:</strong> {new Date().toLocaleDateString()} 09:30</div>
                  <div><strong>Reported:</strong> {new Date().toLocaleDateString()} 11:45</div>
                  <div><strong>Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>VALIDATED</span></div>
                </div>

                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', color: '#0369a1', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                  COMPLETE BLOOD COUNT (CBC) - 5 PART DIFFERENTIAL
                </h4>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Parameter</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Observed Value</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Biological Reference</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Hemoglobin</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>14.2</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>13.0 - 17.0</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>g/dL</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Total Leukocyte Count (TLC)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>7,400</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>4,000 - 11,000</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>cells/cumm</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Platelet Count</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>245,000</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>150,000 - 450,000</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>cells/cumm</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem' }}>Packed Cell Volume (PCV)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>42.6</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>40.0 - 50.0</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>%</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Report validated on automated Sysmex XN-1000 Analyzer.
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '160px', marginBottom: '0.25rem' }}></div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Dr. Raymond Chen, MD</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Consultant Pathologist • NABL Signatory</div>
                  </div>
                </div>
              </div>
            )}

            {templateType === 'discharge' && (
              <div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div><strong>Patient:</strong> Vikram Sharma</div>
                  <div><strong>UHID / IP No:</strong> PAT-000412 / IPD-891</div>
                  <div><strong>Room / Bed:</strong> Ward 3 - Bed B-12</div>
                  <div><strong>Admitted On:</strong> 12-09-2026</div>
                  <div><strong>Discharged On:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Attending Doctor:</strong> Dr. Sarah Jenkins</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#0369a1' }}>Final Clinical Diagnosis</h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem' }}>Acute Hypertensive Urgency with Mild Pulmonary Congestion (Stabilized)</p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#0369a1' }}>Hospital Course & Treatment Summary</h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.5 }}>
                    Patient presented with severe headache and elevated BP of 190/110. Admitted to telemetry ward. Intravenous antihypertensive infusion administered. Serial ECG and cardiac biomarkers normal. Blood pressure stabilized to 124/80 mmHg upon discharge.
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#0369a1' }}>Discharge Medications</h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem' }}>1. Tab Telmisartan 40mg OD • 2. Tab Amlodipine 5mg OD • 3. Tab Aspirin 75mg OD</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Follow-up OPD visit scheduled after 7 days in Cardiology OPD.
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '160px', marginBottom: '0.25rem' }}></div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Dr. Sarah Jenkins, MD</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Chief Medical Officer / Consultant</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#16a34a' }}>
            <CheckCircle size={15} /> All hospital master attributes and logos dynamically bound.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#e2e8f0',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
