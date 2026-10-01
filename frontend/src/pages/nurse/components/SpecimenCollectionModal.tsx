import React, { useState } from 'react';
import {
  FlaskConical,
  Printer,
  CheckCircle2,
  X,
  AlertCircle,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react';
import { SharedLabOrder } from '../../../services/patientJourneyService';

interface SpecimenCollectionModalProps {
  order: SharedLabOrder | null;
  nurseName: string;
  onClose: () => void;
  onConfirmCollection: (orderId: string, collectorName: string) => void;
}

export const SpecimenCollectionModal: React.FC<SpecimenCollectionModalProps> = ({
  order,
  nurseName,
  onClose,
  onConfirmCollection,
}) => {
  if (!order) return null;

  const [collector, setCollector] = useState(nurseName || 'Nurse Clara Adams, RN');
  const [chkIdentity, setChkIdentity] = useState(true);
  const [chkFasting, setChkFasting] = useState(true);
  const [chkLabelBedside, setChkLabelBedside] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAlreadyCollected =
    order.stage !== 'ORDERED';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCollection(order.id, collector);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBarcode = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {isAlreadyCollected ? 'Specimen Barcode & Dispatch Dossier' : 'Bedside Phlebotomy & Specimen Collection'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Order #{order.orderNo} • Prescribed by {order.doctor}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Patient & Test Overview Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            padding: '14px 16px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Patient</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--secondary)' }}>{order.patientName}</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              UHID: <code>{order.uhid}</code> • {order.age} Y / {order.gender}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Investigation</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{order.testName}</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Dept: {order.category}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Vacutainer Container</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: order.containerColor || '#94a3b8',
                  border: '1px solid rgba(0,0,0,0.2)',
                  display: 'inline-block',
                }}
              />
              <strong style={{ color: 'var(--text-main)', fontSize: '0.84rem' }}>
                {order.container}
              </strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Sample: {order.sampleType}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Order Priority & Status</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
              <span
                className={`badge ${order.priority === 'STAT' ? 'badge-danger' : 'badge-secondary'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {order.priority || 'ROUTINE'}
              </span>
              <span
                className={`badge ${isAlreadyCollected ? 'badge-info' : 'badge-warning'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {isAlreadyCollected ? 'SAMPLE COLLECTED' : 'AWAITING COLLECTION'}
              </span>
            </div>
          </div>
        </div>

        {/* 2" x 1" Thermal Barcode Label Preview */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Specimen Tube Barcode Label Preview (2" x 1" Thermal)
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrintBarcode}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
            >
              <Printer size={13} /> Print Label
            </button>
          </div>

          <div
            style={{
              border: '2px dashed var(--border-color)',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ width: '100%', maxWidth: '380px', border: '1px solid #000000', padding: '10px 14px', borderRadius: '4px', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '6px' }}>
                <span>NORTHMARK HOSPITAL LAB</span>
                <span>{order.priority === 'STAT' ? '🚨 STAT' : 'ROUTINE'}</span>
              </div>

              {/* Barcode Visualizer */}
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <div
                  style={{
                    letterSpacing: '5px',
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    fontWeight: 900,
                    transform: 'scaleY(1.4)',
                    color: '#000000',
                  }}
                >
                  ||||| | |||| || ||| |||| | |||
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px', color: '#111827', marginTop: '4px' }}>
                  {order.barcode}
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#111827', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                <div><strong>Pt:</strong> {order.patientName}</div>
                <div><strong>UHID:</strong> {order.uhid}</div>
                <div><strong>Test:</strong> {order.testName}</div>
                <div><strong>Cap:</strong> {order.container.split('(')[0]}</div>
                <div><strong>Collector:</strong> {order.sampleCollector || collector}</div>
                <div><strong>Time:</strong> {order.collectedAt || 'NOW'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Phlebotomy Protocol Checklist (if not collected yet) */}
        {!isAlreadyCollected && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              Bedside Phlebotomy Verification Protocol
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={chkIdentity}
                  onChange={(e) => setChkIdentity(e.target.checked)}
                />
                <span>Two-point patient identity confirmed (wristband barcode scan & oral name/DOB verification)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={chkFasting}
                  onChange={(e) => setChkFasting(e.target.checked)}
                />
                <span>Pre-analytical preparation verified (fasting state, medication timing)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={chkLabelBedside}
                  onChange={(e) => setChkLabelBedside(e.target.checked)}
                />
                <span>Vacutainer tube labeled immediately at bedside; gentle 8-10x inversions performed</span>
              </label>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Staff Nurse / Phlebotomist Name
              </label>
              <input
                type="text"
                className="form-input"
                value={collector}
                onChange={(e) => setCollector(e.target.value)}
                style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                placeholder="Nurse / Phlebotomist Name"
              />
            </div>
          </div>
        )}

        {isAlreadyCollected && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--success-light)',
              borderRadius: '8px',
              border: '1px solid var(--success)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.84rem',
              color: '#065f46',
            }}
          >
            <CheckCircle2 size={18} color="var(--success)" />
            <div>
              <strong>Sample Collected & Transferred to Central Lab</strong>
              <div style={{ fontSize: '0.75rem' }}>
                Collector: {order.sampleCollector || 'Nurse Clara Adams'} • Timestamp: {order.collectedAt || 'Recently'}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>

          {!isAlreadyCollected ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSubmitting || !chkIdentity || !chkFasting || !chkLabelBedside}
              onClick={handleConfirm}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Confirming...' : 'Confirm Collection & Print Label'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintBarcode}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Print Replacement Label
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
