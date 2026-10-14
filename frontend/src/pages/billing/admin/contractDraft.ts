// Billing · Admin — payer contract form state and its mapping to the corporate-account API.
import { CorporateAccount } from '../../../services/billingService';

export interface ContractDraft {
  id: string | null;
  code: string;
  name: string;
  credit_limit: string;
  co_pay_percentage: string;
  deductible_amount: string;
  room_rent_ceiling: string;
  tariff_discount_percent: string;
  settlement_tat_days: string;
  valid_until: string;
  contract_reference: string;
  billing_cycle: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export const contractDraft = (a?: CorporateAccount): ContractDraft => ({
  id: a?.id || null,
  code: s(a?.code),
  name: s(a?.name),
  credit_limit: a ? s(Number(a.credit_limit)) : '',
  co_pay_percentage: a ? s(Number(a.co_pay_percentage)) : '0',
  deductible_amount: a ? s(Number(a.deductible_amount)) : '0',
  room_rent_ceiling: a ? s(Number(a.room_rent_ceiling)) : '0',
  tariff_discount_percent: s(a?.tariff_discount_percent ?? 0),
  settlement_tat_days: s(a?.settlement_tat_days ?? 30),
  valid_until: s(a?.valid_until),
  contract_reference: s(a?.contract_reference),
  billing_cycle: s(a?.billing_cycle),
  contact_person: s(a?.contact_person),
  contact_email: s(a?.contact_email),
  contact_phone: s(a?.contact_phone),
});

/** Draft → API payload (numbers as numbers, blank date as null). */
export const contractPayload = (d: ContractDraft): Partial<CorporateAccount> => ({
  ...(d.id ? {} : { code: d.code.trim().toUpperCase() }),
  name: d.name.trim(),
  credit_limit: Number(d.credit_limit) || 0,
  co_pay_percentage: Number(d.co_pay_percentage) || 0,
  deductible_amount: Number(d.deductible_amount) || 0,
  room_rent_ceiling: Number(d.room_rent_ceiling) || 0,
  tariff_discount_percent: Number(d.tariff_discount_percent) || 0,
  settlement_tat_days: parseInt(d.settlement_tat_days, 10) || 0,
  valid_until: d.valid_until || null,
  contract_reference: d.contract_reference.trim(),
  billing_cycle: d.billing_cycle.trim(),
  contact_person: d.contact_person.trim(),
  contact_email: d.contact_email.trim(),
  contact_phone: d.contact_phone.trim(),
});
