import React, { useState } from 'react';
import { billingService, SupervisorApprovalRequest } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { CASHIER_DISCOUNT_CEILING_PERCENT, discountLimitText, round2 } from './cashierMath';
import { Btn, C, Callout, Drawer, Field, Row, apiError, inputStyle } from './executiveUi';

const REASONS = ['Senior Citizen (extended)', 'Financial hardship', 'Staff referral', 'Repeat visit within 7 days'];

interface Props {
  patientId: string;
  patientName: string;
  gross: number;
  defaultReason?: string;
  onClose: () => void;
  onSubmitted: (req: SupervisorApprovalRequest) => void;
}

/** Cashier -> Billing Supervisor discount request (four-eyes: the cashier can never self-approve above 5%). */
export const DiscountRequestDrawer: React.FC<Props> = ({ patientId, patientName, gross, defaultReason = '', onClose, onSubmitted }) => {
  const { format: fmt } = useCurrency();
  const [pct, setPct] = useState('15');
  const [reason, setReason] = useState(defaultReason);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = parseFloat(pct) || 0;
  const value = round2((gross * p) / 100);
  const disabled = p <= CASHIER_DISCOUNT_CEILING_PERCENT || p > 100 || !reason || submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const req = await billingService.createApprovalRequest({
        patient: patientId,
        bill_gross: gross,
        discount_percent: p,
        reason,
        notes: note
      });
      onSubmitted(req);
    } catch (err) {
      setError(apiError(err, 'Could not send the request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Request discount"
      subtitle={`${patientName} · sent to Billing Supervisor for approval`}
      width={480}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={disabled} onClick={submit}>
            {submitting ? 'Sending…' : 'Send for approval'}
          </Btn>
        </div>
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      <Row label="Bill gross" value={fmt(gross)} strong />
      <Field label="Discount (%)" hint={discountLimitText(p, gross)}>
        <input style={inputStyle} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
      </Field>
      <Field label="Reason">
        <select style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select reason</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note for supervisor">
        <textarea
          style={{ ...inputStyle, height: 'auto', padding: 10, resize: 'vertical' }}
          rows={3}
          placeholder="Context the supervisor needs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <Row label="Discount value" value={`− ${fmt(value)}`} strong />
      </div>
    </Drawer>
  );
};
