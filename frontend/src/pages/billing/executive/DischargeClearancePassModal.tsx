import React from 'react';
import { ShieldCheck, Printer, CheckCircle, X } from 'lucide-react';
import { Btn, C } from './executiveUi';
import { useCurrency } from '../../../config/currency';

export interface DischargePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: {
    pass_number: string;
    patient_name: string;
    admission_number: string;
    uhid: string;
    ward_name: string;
    bed_number?: string | null;
    cleared_at?: string | null;
    is_override?: boolean;
    override_reason?: string;
  } | null;
}

export const DischargeClearancePassModal: React.FC<DischargePassModalProps> = ({
  isOpen,
  onClose,
  pass
}) => {
  const { format } = useCurrency();

  if (!isOpen || !pass) return null;

  const timeStr = pass.cleared_at
    ? new Date(pass.cleared_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(17, 24, 39, 0.4)',
        backdropFilter: 'blur(3px)'
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: 460,
          maxWidth: '100%',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 24px 48px rgba(17, 24, 39, 0.2)',
          border: `1px solid ${C.border}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: C.greenSoft,
                color: C.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} />
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
              Financial Discharge Cleared
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: 'transparent',
              borderRadius: 8,
              cursor: 'pointer',
              color: C.textSub,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Clearance Pass Card */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: 16,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            background: '#F9FAFB'
          }}
        >
          {/* Simulated QR block styled per spec */}
          <div
            style={{
              width: 110,
              height: 110,
              flex: '0 0 110px',
              borderRadius: 8,
              background: 'repeating-linear-gradient(45deg, #F3F4F6 0 6px, #E5E7EB 6px 12px)',
              border: `1px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 600,
              color: C.textSub,
              textAlign: 'center',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
            }}
          >
            <CheckCircle size={28} style={{ color: C.green, marginBottom: 4 }} />
            <span>GATE PASS</span>
            <span style={{ fontSize: 9, color: C.textSub }}>SECURITY QR</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: C.primary }}>
              {pass.pass_number}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pass.patient_name}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.textSub }}>
              {pass.admission_number} · {pass.uhid}
            </span>
            <span style={{ fontSize: 12, color: C.textSub }}>
              {pass.ward_name}{pass.bed_number ? ` · ${pass.bed_number}` : ''}
            </span>
            <span style={{ fontSize: 12, color: pass.is_override ? C.amber : C.green, fontWeight: 600 }}>
              {pass.is_override ? 'Audited Override' : 'Balance ₹0.00'} · {timeStr}
            </span>
          </div>
        </div>

        {pass.is_override && pass.override_reason && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: C.amberSoft,
              border: `1px solid ${C.amberBorder}`,
              fontSize: 12,
              color: C.amber,
              lineHeight: 1.5
            }}
          >
            <b>Audited Override Note:</b> {pass.override_reason}
          </div>
        )}

        <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
          Ward nursing and hospital security gate now see this admission as <b>CLEARED</b> in real time. Patient is authorized for final physical packaging and exit.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn
            variant="ghost"
            onClick={handlePrint}
            style={{ flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Printer size={16} /> Print pass
          </Btn>
          <Btn
            variant="primary"
            onClick={onClose}
            style={{ flex: 1, height: 42 }}
          >
            Done
          </Btn>
        </div>
      </div>
    </div>
  );
};
