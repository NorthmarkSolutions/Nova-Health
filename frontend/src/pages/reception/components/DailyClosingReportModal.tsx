import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  QrCode,
  Users,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  DailyCounterSession,
  SharedInvoice,
  SharedQueueToken,
  SharedPatient,
  patientJourneyService,
} from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: DailyCounterSession;
  queue: SharedQueueToken[];
  invoices: SharedInvoice[];
  patients: SharedPatient[];
  onSessionClosed: (session: DailyCounterSession) => void;
}

export const DailyClosingReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  session,
  queue,
  invoices,
  patients,
  onSessionClosed,
}) => {
  if (!isOpen) return null;

  // Compute Shift Financials
  const cashInvoices = invoices.filter((i) => i.status === 'PAID');
  const cashTotal = cashInvoices.reduce((acc, i) => acc + (i.paid || 0), 0);
  const openingFloat = session.openingFloat || 150.0;
  const expectedTotalCashInDrawer = openingFloat + cashTotal;

  const [countedCash, setCountedCash] = useState<number>(expectedTotalCashInDrawer);
  const [closingNotes, setClosingNotes] = useState('All tokens processed. Cash drawer reconciled and balanced.');
  const [isClosed, setIsClosed] = useState(session.status === 'CLOSED');

  const cashVariance = countedCash - expectedTotalCashInDrawer;

  // Operational Stats
  const totalTokens = queue.length;
  const completedTokens = queue.filter((q) => q.status === 'COMPLETED').length;
  const inConsultationTokens = queue.filter((q) => q.status === 'IN_CONSULTATION').length;
  const waitingTokens = queue.filter((q) => q.status === 'WAITING' || q.status === 'TRIAGED').length;
  const noShowTokens = queue.filter((q) => q.status === 'NO_SHOW').length;
  const walkInCount = queue.filter((q) => q.type === 'WALK_IN').length;
  const scheduledCount = queue.filter((q) => q.type === 'SCHEDULED' || q.type === 'FOLLOW_UP').length;

  // Doctor visit breakdown
  const doctorVisitCounts = queue.reduce((acc: Record<string, number>, q) => {
    const doc = q.doctor.split('(')[0].trim();
    acc[doc] = (acc[doc] || 0) + 1;
    return acc;
  }, {});

  const handleCloseShift = () => {
    if (window.confirm('Are you sure you want to close this counter shift? You can print the daily closing handover report.')) {
      const closed = patientJourneyService.closeCounterSession(closingNotes);
      setIsClosed(true);
      onSessionClosed(closed);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '720px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.5rem',
                borderRadius: '10px',
                display: 'flex',
              }}
            >
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Reception Daily Closing & Handover Report
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Shift financial reconciliation, token volume summary & cashier drawer settlement
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Report Card */}
        <div
          id="closing-report-printable"
          style={{
            border: '1.5px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Hospital Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>
              NORTH HOSPITAL
            </h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Outpatient Department (OPD) • Daily Counter Shift Handover
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-light)' }}>
              Date: {new Date().toLocaleDateString()} • Generated at: {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Shift Metadata Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.7813rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Counter Station:</span>
              <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{session.counterNumber}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Receptionist:</span>
              <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{session.receptionistName}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Shift Window:</span>
              <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{session.shift}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <div style={{ fontWeight: 800, color: session.status === 'OPEN' ? '#16a34a' : '#ef4444' }}>
                {session.status}
              </div>
            </div>
          </div>

          {/* Section 1: Financial & Cash Drawer Reconciliation */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
              1. Cash Drawer & Revenue Reconciliation
            </h4>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '0.6rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                <span>Opening Cash Float (Verified at shift start)</span>
                <strong style={{ textAlign: 'right' }}>${openingFloat}.00</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '0.6rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                <span>OPD Consultation & Registration Counter Revenue ({invoices.length} Invoices)</span>
                <strong style={{ textAlign: 'right', color: '#15803d' }}>+${cashTotal}.00</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '0.75rem 1rem', backgroundColor: '#f1f5f9', fontWeight: 900, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                <span>Total Expected Cash in Drawer</span>
                <span style={{ textAlign: 'right', color: '#0284c7' }}>${expectedTotalCashInDrawer}.00</span>
              </div>
            </div>

            {/* Cash count input */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>
                  Actual Physical Cash Counted in Till:
                </span>
                <input
                  type="number"
                  className="form-input"
                  value={countedCash}
                  onChange={(e) => setCountedCash(Number(e.target.value))}
                  style={{ width: '120px', fontWeight: 800, fontSize: '1rem', color: '#1e40af' }}
                />
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: cashVariance === 0 ? '#dcfce7' : '#fee2e2',
                    color: cashVariance === 0 ? '#15803d' : '#991b1b',
                  }}
                >
                  {cashVariance === 0 ? '✓ Balanced ($0 Variance)' : `⚠️ Variance: ${cashVariance > 0 ? '+' : ''}$${cashVariance}.00`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Patient & Token Operational Volumes */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
              2. Patient Throughput & Token Operations
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>Total Tokens</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--secondary)' }}>{totalTokens}</div>
                <div style={{ fontSize: '0.6875rem', color: '#0284c7' }}>{walkInCount} Walk-In • {scheduledCount} Appts</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.7188rem', color: '#166534' }}>Completed Consults</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d' }}>{completedTokens}</div>
                <div style={{ fontSize: '0.6875rem', color: '#16a34a' }}>Patient Checked-Out</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.7188rem', color: '#92400e' }}>Active In-Progress</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309' }}>{inConsultationTokens + waitingTokens}</div>
                <div style={{ fontSize: '0.6875rem', color: '#b45309' }}>{inConsultationTokens} In-Room • {waitingTokens} Waiting</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>No-Shows / Cancel</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#64748b' }}>{noShowTokens}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Missed Turns</div>
              </div>
            </div>
          </div>

          {/* Section 3: Attending Consultant Distribution */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
              3. Attending Doctor Patient Distribution
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {Object.entries(doctorVisitCounts).map(([docName, count]) => (
                <div
                  key={docName}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.7813rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{docName}</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                    {count} Patients
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Handover & Signatures */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Outgoing Receptionist Signature:</span>
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #000000', width: '180px', paddingTop: '0.2rem', fontWeight: 700 }}>
                {session.receptionistName}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Hospital Supervisor / Accounts Verified:</span>
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid #000000', width: '180px', paddingTop: '0.2rem', fontWeight: 700 }}>
                Accounts Officer
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              window.print();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
          >
            <Printer size={16} /> Print Daily Closing Report
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close Preview
            </button>

            {!isClosed && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseShift}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
              >
                <Lock size={16} /> Close Shift & Handover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
