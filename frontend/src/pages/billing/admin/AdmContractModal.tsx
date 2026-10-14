// Billing · Admin — add or edit a payer contract (insurer / TPA or corporate employer). Counters bill by these terms;
// every save is written to the audit log on the server.
import React, { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { HmsButton, HmsField, HmsModal, INPUT } from '../../../components/hms';
import { ContractDraft } from './contractDraft';

export const AdmContractModal: React.FC<{
  kind: 'insurer' | 'corporate';
  initial: ContractDraft;
  busy: boolean;
  onClose: () => void;
  onSave: (d: ContractDraft) => void;
}> = ({ kind, initial, busy, onClose, onSave }) => {
  const [d, setD] = useState(initial);
  const set = (k: keyof ContractDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const invalid = !d.name.trim() || (!d.id && !d.code.trim());
  const field = (k: keyof ContractDraft, label: string, opts: { hint?: string; type?: string; decimal?: boolean; required?: boolean; autoFocus?: boolean; disabled?: boolean } = {}) => (
    <HmsField label={label} htmlFor={`ct-${k}`} hint={opts.hint} required={opts.required}>
      <input id={`ct-${k}`} type={opts.type || 'text'} inputMode={opts.decimal ? 'decimal' : undefined} style={INPUT} value={d[k] || ''} onChange={set(k)} autoFocus={opts.autoFocus} disabled={opts.disabled} />
    </HmsField>
  );
  const what = kind === 'insurer' ? 'insurer / TPA' : 'corporate';
  return (
    <HmsModal
      title={d.id ? `Edit ${initial.name}` : `Add a ${what} contract`}
      description="Counters split every bill by these terms. The change is recorded in the audit log."
      onClose={onClose}
      busy={busy}
      width={720}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={d.id ? Save : Plus} disabled={busy || invalid} onClick={() => onSave(d)}>
            {busy ? 'Saving…' : d.id ? 'Save terms' : 'Add contract'}
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
        {field('code', 'Code', { required: true, disabled: !!d.id, autoFocus: !d.id })}
        <div style={{ gridColumn: 'span 2' }}>{field('name', 'Name', { required: true, autoFocus: !!d.id })}</div>
        {field('credit_limit', 'Credit limit', { decimal: true, hint: kind === 'insurer' ? 'Outstanding claims ceiling' : 'Unbilled + unpaid ceiling' })}
        {field('co_pay_percentage', 'Co-pay (%)', { decimal: true, hint: 'Patient share of admissible bill' })}
        {field('deductible_amount', 'Deductible', { decimal: true })}
        {field('room_rent_ceiling', 'Room rent cap / day', { decimal: true, hint: '0 = no cap' })}
        {field('tariff_discount_percent', 'Tariff discount (%)', { decimal: true, hint: 'Off hospital rates' })}
        {field('settlement_tat_days', 'Pays within (days)', { decimal: true })}
        {field('valid_until', 'Valid until', { type: 'date' })}
        {field('contract_reference', 'Contract / MOU ref.')}
        {field('billing_cycle', 'Billing cycle', { hint: 'e.g. Monthly' })}
        {field('contact_person', 'Contact person')}
        {field('contact_email', 'Contact email', { type: 'email' })}
        {field('contact_phone', 'Contact phone')}
      </div>
    </HmsModal>
  );
};
