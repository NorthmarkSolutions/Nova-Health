import React, { useState } from 'react';
import {
  FlaskConical,
  FileCheck,
  AlertTriangle,
  Plus,
  Check,
  Search,
  Barcode,
  Printer,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  QrCode,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { patientJourneyService, SharedLabOrder } from '../../services/patientJourneyService';

interface LabSampleOrder {
  id: string;
  orderNo: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  testName: string;
  category: string;
  sampleType: string;
  container: string;
  doctor: string;
  barcode: string;
  stage: any;
  parameters: {
    paramName: string;
    observedValue: string;
    referenceRange: string;
    unit: string;
    isAbnormal: boolean;
  }[];
  technicianNote?: string;
  pathologistRemarks?: string;
  isFlaggedAbnormal: boolean;
  price: number;
}

export const LabDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'worklist' | 'catalogue' | 'pathologist' | 'analytics'>('worklist');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showResultModal, setShowResultModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<LabSampleOrder | null>(null);

  // Diagnostic Orders synchronized with patientJourneyService
  const [orders, setOrders] = useState<LabSampleOrder[]>(() => patientJourneyService.getLabOrders());

  // Test Catalogue Master Data
  const testCatalogue = [
    { code: 'HEM-001', name: 'Complete Blood Count (CBC)', category: 'Hematology', sample: 'Whole Blood (EDTA)', tat: '2 Hours', price: 45 },
    { code: 'HEM-002', name: 'Peripheral Blood Smear Examination', category: 'Hematology', sample: 'Whole Blood (EDTA)', tat: '4 Hours', price: 30 },
    { code: 'BIO-001', name: 'Liver Function Test (LFT)', category: 'Biochemistry', sample: 'Serum (SST)', tat: '3 Hours', price: 65 },
    { code: 'BIO-002', name: 'Kidney Function Test (KFT / RFT)', category: 'Biochemistry', sample: 'Serum (SST)', tat: '3 Hours', price: 60 },
    { code: 'BIO-003', name: 'Lipid Profile Screen', category: 'Biochemistry', sample: 'Serum (Fasting 12h)', tat: '4 Hours', price: 55 },
    { code: 'PAT-001', name: 'Urine Routine & Microscopic Examination', category: 'Pathology', sample: 'Midstream Urine', tat: '1 Hour', price: 25 },
    { code: 'MIC-001', name: 'Blood Culture & Antimicrobial Sensitivity', category: 'Microbiology', sample: 'Blood in BACTEC bottle', tat: '48 Hours', price: 110 },
    { code: 'SER-001', name: 'Dengue NS1 Antigen & IgM/IgG Duo', category: 'Serology', sample: 'Serum (Red Top)', tat: '2 Hours', price: 50 },
    { code: 'PKG-001', name: 'Executive Master Health Package (65 Tests)', category: 'Packages', sample: 'Blood & Urine', tat: '6 Hours', price: 180 },
  ];

  // Pipeline advancement
  const handleAdvanceStage = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id !== orderId) return o;
        let nextStage = o.stage;
        if (o.stage === 'ORDERED') nextStage = 'PAID';
        else if (o.stage === 'PAID') nextStage = 'SAMPLE_COLLECTED';
        else if (o.stage === 'COLLECTED' || o.stage === 'SAMPLE_COLLECTED') nextStage = 'BARCODED';
        else if (o.stage === 'BARCODED') nextStage = 'PROCESSING';
        else if (o.stage === 'PROCESSING') nextStage = 'RESULT_ENTERED';
        else if (o.stage === 'RESULT_ENTERED') nextStage = 'VALIDATED';
        else if (o.stage === 'VALIDATED') nextStage = 'REPORT_GENERATED';
        else if (o.stage === 'REPORT_GENERATED') {
          setActiveOrder(o);
          setShowReportModal(true);
          return o;
        } else {
          nextStage = 'PROCESSING';
        }
        return { ...o, stage: nextStage };
      });

      const changed = updated.find((o) => o.id === orderId);
      if (changed) {
        patientJourneyService.updateLabOrder(orderId, { stage: changed.stage });
      }
      return updated;
    });
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'ORDERED':
        return <span className="badge badge-secondary">Order Received</span>;
      case 'PAID':
        return <span className="badge badge-warning">Payment Verified</span>;
      case 'COLLECTED':
      case 'SAMPLE_COLLECTED':
        return <span className="badge badge-info" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>Sample Collected</span>;
      case 'BARCODED':
        return <span className="badge badge-secondary" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>Barcoded</span>;
      case 'PROCESSING':
        return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#b45309', animation: 'pulse 2s infinite' }}>Analyzing...</span>;
      case 'RESULT_ENTERED':
        return <span className="badge badge-secondary" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>Results Logged</span>;
      case 'VALIDATED':
        return <span className="badge badge-success">Pathologist Approved</span>;
      case 'REPORT_GENERATED':
        return <span className="badge badge-success" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>✓ Report Ready</span>;
      default:
        return <span className="badge badge-secondary">{stage}</span>;
    }
  };


  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || o.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 className="page-title">Diagnostic Laboratory & Pathology</h2>
              <p className="page-subtitle">
                8-Stage sample workflow: Order $\rightarrow$ Barcode $\rightarrow$ Analyzer $\rightarrow$ Pathologist Validation $\rightarrow$ Report
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('pathologist')}>
            <ShieldCheck size={16} /> Pathologist Sign-Off Desk
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('catalogue')}>
            <Plus size={18} /> Test Catalogue
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Strip */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <FlaskConical size={24} />
            </div>
            <div>
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Total Diagnostic Orders</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">
                {orders.filter((o) => o.stage === 'PROCESSING' || o.stage === 'SAMPLE_COLLECTED').length}
              </div>
              <div className="stat-label">In Processing Pipeline</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="stat-value">{orders.filter((o) => o.isFlaggedAbnormal).length}</div>
              <div className="stat-label">Critical Abnormal Values</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="stat-value">98.4%</div>
              <div className="stat-label">On-Time TAT Compliance</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-item ${activeTab === 'worklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('worklist')}
          >
            <Activity size={18} /> 8-Step Sample Processing Worklist
          </button>
          <button
            className={`tab-item ${activeTab === 'catalogue' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalogue')}
          >
            <FlaskConical size={18} /> Master Test Catalogue
          </button>
          <button
            className={`tab-item ${activeTab === 'pathologist' ? 'active' : ''}`}
            onClick={() => setActiveTab('pathologist')}
          >
            <ShieldCheck size={18} /> Pathologist Approval Station
          </button>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-box" style={{ minWidth: '320px' }}>
            <Search size={18} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search by test, patient name, UHID, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
            {['ALL', 'Hematology', 'Biochemistry', 'Pathology'].map((c) => (
              <button
                key={c}
                className={`subtab-pill ${selectedCategory === c ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: 8-Step Sample Processing Worklist */}
        {activeTab === 'worklist' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Diagnostic Orders & Specimen Tracking
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Sample flow: Paid $\rightarrow$ Phlebotomy Collect $\rightarrow$ Barcode $\rightarrow$ Analyzer $\rightarrow$ Result
                </p>
              </div>
              <span className="badge badge-info">{filteredOrders.length} Samples in Pipeline</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order & Barcode</th>
                    <th>Patient Name & UHID</th>
                    <th>Investigation Test</th>
                    <th>Container / Specimen</th>
                    <th>Ordering Doctor</th>
                    <th>Pipeline Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <div style={{ fontWeight: 800 }}>{ord.orderNo}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 700 }}>
                          <Barcode size={12} /> {ord.barcode}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{ord.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {ord.uhid} • {ord.age}Y • {ord.gender}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>{ord.testName}</div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {ord.category}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{ord.sampleType}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{ord.container}</div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>{ord.doctor}</div>
                      </td>

                      <td>{getStageBadge(ord.stage)}</td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* Barcode button */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveOrder(ord);
                              setShowBarcodeModal(true);
                            }}
                            title="Print Vacutainer Barcode"
                          >
                            <Barcode size={14} />
                          </button>

                          {/* Enter Results button */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveOrder(ord);
                              setShowResultModal(true);
                            }}
                            title="Enter / Review Results"
                          >
                            <FileText size={14} /> Result
                          </button>

                          {/* Advance pipeline stage */}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAdvanceStage(ord.id)}
                            title="Advance Stage"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Master Test Catalogue */}
        {activeTab === 'catalogue' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Hospital Diagnostic Test Catalogue
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Standardized test profiles across Hematology, Biochemistry, Microbiology & Wellness Packages
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => alert('Add Test modal: define test code, normal intervals, and tariff.')}
              >
                <Plus size={14} /> Add Test Definition
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Test Code</th>
                    <th>Test Name</th>
                    <th>Department</th>
                    <th>Specimen Required</th>
                    <th>Target TAT</th>
                    <th>Hospital Tariff</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {testCatalogue.map((t) => (
                    <tr key={t.code}>
                      <td><code>{t.code}</code></td>
                      <td><strong>{t.name}</strong></td>
                      <td><span className="badge badge-secondary">{t.category}</span></td>
                      <td>{t.sample}</td>
                      <td>{t.tat}</td>
                      <td><strong style={{ color: 'var(--primary)' }}>${t.price.toFixed(2)}</strong></td>
                      <td><span className="badge badge-success">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Pathologist Sign-Off Station */}
        {activeTab === 'pathologist' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Pathologist Review & Digital Verification Station
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Dr. Alan Grant, MD (Pathology) • Clinical validation of abnormal values prior to patient release
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders
                .filter((o) => o.isFlaggedAbnormal || o.stage === 'RESULT_ENTERED')
                .map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #fca5a5',
                      backgroundColor: '#fff5f5',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle color="var(--danger)" size={20} />
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>
                            {ord.testName} — {ord.patientName} ({ord.uhid})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Order: {ord.orderNo} • Sample: {ord.barcode} • Prescribed by {ord.doctor}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-danger">Critical / Abnormal Review</span>
                    </div>

                    {/* Parameter Values Grid */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem' }}>
                      <table style={{ fontSize: '0.8125rem' }}>
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Observed Value</th>
                            <th>Reference Interval</th>
                            <th>Unit</th>
                            <th>Severity Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ord.parameters.map((p, i) => (
                            <tr key={i}>
                              <td>{p.paramName}</td>
                              <td><strong style={{ color: p.isAbnormal ? 'var(--danger)' : 'var(--secondary)' }}>{p.observedValue}</strong></td>
                              <td>{p.referenceRange}</td>
                              <td>{p.unit}</td>
                              <td>
                                {p.isAbnormal ? (
                                  <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>HIGH / ABNORMAL</span>
                                ) : (
                                  <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>NORMAL</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                        <strong>Pathologist Note:</strong> {ord.pathologistRemarks || 'No remarks recorded.'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveOrder(ord);
                            setShowReportModal(true);
                          }}
                        >
                          <Printer size={14} /> Preview Final Report
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            handleAdvanceStage(ord.id);
                            alert(`Report approved and digitally signed for ${ord.patientName}! Available in Doctor OPD.`);
                          }}
                        >
                          <CheckCircle2 size={14} /> Approve & Release Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Barcode Generation & Tube Label */}
      {showBarcodeModal && activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 className="modal-title">Specimen Tube Barcode</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBarcodeModal(false)}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-color)', margin: '1rem 0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)' }}>NORTH HOSPITAL LAB</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{activeOrder.container}</div>

              <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Barcode size={64} color="var(--secondary)" />
                <code style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.1em', marginTop: '0.25rem' }}>
                  {activeOrder.barcode}
                </code>
              </div>

              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                {activeOrder.patientName} • {activeOrder.uhid}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {activeOrder.testName} • {new Date().toLocaleDateString()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowBarcodeModal(false)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                  setShowBarcodeModal(false);
                }}
              >
                <Printer size={16} /> Print Barcode Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Multi-Parameter Result Entry Form */}
      {showResultModal && activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Enter Results — {activeOrder.testName}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {activeOrder.orderNo} • {activeOrder.patientName} ({activeOrder.uhid})
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResultModal(false)}>✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowResultModal(false);
                handleAdvanceStage(activeOrder.id);
                alert('Results submitted for Pathologist verification.');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Test Parameter</th>
                      <th>Observed Value *</th>
                      <th>Unit</th>
                      <th>Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.parameters.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.paramName}</strong></td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            defaultValue={p.observedValue}
                            style={{ width: '120px' }}
                            required
                          />
                        </td>
                        <td>{p.unit}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.referenceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-group">
                <label className="form-label">Technician Clinical Remarks</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  defaultValue={activeOrder.technicianNote || 'Specimen processed on automated chemistry analyzer. Calibrators valid.'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResultModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FileCheck size={16} /> Save & Send to Pathologist</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Diagnostic Laboratory Report */}
      {showReportModal && activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--secondary)' }}>NORTH HOSPITAL</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department of Pathology & Laboratory Medicine</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>Accredited by CAP & NABL • ISO 15189 Certified</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>REPORT ID: {activeOrder.orderNo}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Sample: {activeOrder.barcode}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              <div><strong>Patient:</strong> {activeOrder.patientName}</div>
              <div><strong>UHID:</strong> {activeOrder.uhid}</div>
              <div><strong>Age / Gender:</strong> {activeOrder.age}Y / {activeOrder.gender}</div>
              <div><strong>Referred By:</strong> {activeOrder.doctor}</div>
              <div><strong>Sample Drawn:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>Status:</strong> Validated Final</div>
            </div>

            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>INVESTIGATION</th>
                    <th>OBSERVED VALUE</th>
                    <th>REFERENCE INTERVAL</th>
                    <th>UNIT</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrder.parameters.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.paramName}</strong></td>
                      <td>
                        <strong style={{ color: p.isAbnormal ? 'var(--danger)' : 'var(--secondary)' }}>
                          {p.observedValue}
                        </strong>
                      </td>
                      <td>{p.referenceRange}</td>
                      <td>{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              <strong>Clinical Interpretation / Remarks:</strong>
              <p style={{ marginTop: '0.25rem', color: 'var(--text-main)' }}>
                {activeOrder.pathologistRemarks || 'All values calibrated against standard controls.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Digitally Verified Document</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>End of Report</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--secondary)' }}>Dr. Alan Grant, MD</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chief Pathologist & Lab Director</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                  setShowReportModal(false);
                }}
              >
                <Printer size={16} /> Print Official Lab Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
