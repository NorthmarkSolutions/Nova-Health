import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  FileText,
  AlertTriangle,
  Clock,
  Search,
  Download,
  Printer,
  X,
  FileCheck,
  Edit3,
} from 'lucide-react';
import { KpiRow, KpiCard } from '../../../components/workspace';
import {
  LabDataStore,
  SignedReportItem,
} from '../data/labDataStore';

interface Props {
  onShowToast?: (msg: string) => void;
}

export const PathologistSignedReportsView: React.FC<Props> = ({ onShowToast }) => {
  const [reports, setReports] = useState<SignedReportItem[]>(() => LabDataStore.getSignedReports());
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentNote, setAmendmentNote] = useState('');

  const refreshReports = () => {
    setReports(LabDataStore.getSignedReports());
  };

  const currentReport = useMemo(() => {
    if (!selectedReportId) return null;
    return reports.find((r) => r.id === selectedReportId || r.reportNumber === selectedReportId) || null;
  }, [reports, selectedReportId]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReportId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // KPIs
  const criticalCount = useMemo(() => reports.filter((r) => r.flag === 'Critical').length, [reports]);
  const amendedCount = useMemo(() => reports.filter((r) => r.isAmended).length, [reports]);
  const abnormalCount = useMemo(() => reports.filter((r) => r.flag === 'Abnormal').length, [reports]);

  // Filtered rows
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (activeFilter === 'critical' && r.flag !== 'Critical') return false;
      if (activeFilter === 'abnormal' && r.flag !== 'Abnormal') return false;
      if (activeFilter === 'amended' && !r.isAmended) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.patientName.toLowerCase().includes(q) ||
          r.uhid.toLowerCase().includes(q) ||
          r.reportNumber.toLowerCase().includes(q) ||
          r.testName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reports, activeFilter, searchQuery]);

  // Actions
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Report,Patient,UHID,Test,SignedAt,Flag,Delivery']
        .concat(
          filteredReports.map(
            (r) =>
              `"${r.reportNumber}","${r.patientName}","${r.uhid}","${r.testName}","${r.signedAt}","${r.flag}","${r.deliveryText}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `signed_reports_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('✓ Exported clinical reports to CSV.');
  };

  const handlePrint = (report: SignedReportItem) => {
    onShowToast?.(`✓ Print job dispatched for ${report.reportNumber} (${report.patientName})`);
  };

  const handleDownload = (report: SignedReportItem) => {
    onShowToast?.(`✓ Downloaded PDF: ${report.reportNumber}.pdf`);
  };

  const handleAmendmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReport || !amendmentNote.trim()) return;
    LabDataStore.issueAmendment(currentReport.id, amendmentNote.trim(), 'Dr. Kavitha Menon, MD');
    refreshReports();
    setShowAmendmentModal(false);
    setAmendmentNote('');
    onShowToast?.(`✓ Clinical amendment issued for ${currentReport.reportNumber}. Ordering clinician notified.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW (§ 9) */}
      <KpiRow>
        <KpiCard
          label="Signed Today"
          value={38}
          trend="Released to OPD/IPD"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Total Historical"
          value={214}
          trend="Archived in EHR"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<FileText size={18} />}
        />
        <KpiCard
          label="Critical Flags"
          value={criticalCount}
          trend="Urgent Alert Logs"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
        <KpiCard
          label="Amended Reports"
          value={amendedCount || 2}
          trend="Clinical Addendums"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
      </KpiRow>

      {/* 2. PRIMARY CONTENT: SIGNED REPORTS ARCHIVE (§ 8 & § 10) */}
      <div className="card" style={{ padding: '20px' }}>
        {/* Filter and Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Reports (${reports.length})` },
              { id: 'critical', label: `Critical (${criticalCount})` },
              { id: 'abnormal', label: `Abnormal (${abnormalCount})` },
              { id: 'amended', label: `Amended (${amendedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`btn btn-sm ${activeFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="search-input-box" style={{ width: '280px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search patient, UHID, report #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 100% Full-Width Reports Table (§ 10: 56px row height, sticky header) */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Report #</th>
                <th>Patient & UHID</th>
                <th>Diagnostic Test</th>
                <th>Sign-off Time</th>
                <th style={{ width: '120px' }}>Flag</th>
                <th>Delivery Channel</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    No signed reports matching this filter.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => {
                  const isCrit = r.flag === 'Critical';
                  const isAbn = r.flag === 'Abnormal';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReportId(r.id)}
                      style={{ height: '56px', cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                          {r.reportNumber}
                        </span>
                      </td>

                      <td>
                        <div>
                          <strong style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                            {r.patientName}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {r.uhid}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                          {r.testName}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {r.signedAt}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isCrit
                              ? 'badge-danger'
                              : isAbn
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {r.flag}
                        </span>
                        {r.isAmended && (
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600, display: 'block' }}>
                            Amended
                          </span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                          {r.deliveryText}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReportId(r.id);
                            }}
                          >
                            View Report
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            title="Download PDF"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(r);
                            }}
                            style={{ padding: '6px 8px' }}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SLIDE-OUT REPORT DETAIL DRAWER */}
      {currentReport && (
        <>
          <div
            onClick={() => setSelectedReportId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '580px',
              maxWidth: '94vw',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-xl, -4px 0 32px rgba(0,0,0,0.15))',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                    {currentReport.reportNumber}
                  </span>
                  <span
                    className={`badge ${
                      currentReport.flag === 'Critical'
                        ? 'badge-danger'
                        : currentReport.flag === 'Abnormal'
                        ? 'badge-warning'
                        : 'badge-success'
                    }`}
                  >
                    {currentReport.flag}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }}>
                  {currentReport.testName}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {currentReport.patientName} • {currentReport.uhid}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReportId(null)}
                style={{
                  border: 'none',
                  background: 'var(--gray-100)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Key Diagnostic Findings */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  KEY DIAGNOSTIC FINDINGS
                </div>
                <div style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: 1.5 }}>
                  {currentReport.keyFindings}
                </div>
              </div>

              {/* Clinical Interpretation */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  PATHOLOGIST CLINICAL INTERPRETATION
                </div>
                <div style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: 1.5 }}>
                  {currentReport.interpretation}
                </div>
              </div>

              {/* Digital Signature Badge */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <FileCheck size={20} color="var(--success)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                    Digitally Signed & Validated
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d' }}>
                    Dr. Kavitha Menon, MD (Consultant Pathologist) • {currentReport.signedAt}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                position: 'sticky',
                bottom: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handlePrint(currentReport)}
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownload(currentReport)}
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAmendmentModal(true)}
              >
                <Edit3 size={15} />
                <span>Issue Addendum</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Amendment Modal */}
      {showAmendmentModal && currentReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="card" style={{ width: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Issue Clinical Addendum</h3>
              <button
                type="button"
                onClick={() => setShowAmendmentModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAmendmentSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Add an official pathologist addendum to report {currentReport.reportNumber}. The amended report will be dished to the physician EHR.
              </p>
              <textarea
                rows={4}
                required
                placeholder="Enter clinical amendment note or corrected interpretation..."
                value={amendmentNote}
                onChange={(e) => setAmendmentNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAmendmentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Sign & Append Addendum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
