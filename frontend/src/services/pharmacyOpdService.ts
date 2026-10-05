import api from './api';

export interface OPDKPIs {
  pending_verification: number;
  stat_count: number;
  otc_sales_today: number;
  otc_revenue_today: number;
  pending_returns: number;
  refund_requests_due: number;
  refund_amount_due: number;
  cd_entries_today: number;
  cd_overrides_today: number;
}

export interface QueueOrderItem {
  id: string;
  medicine: string;
  medicine_code: string;
  medicine_name: string;
  medicine_generic: string;
  medicine_schedule: string;
  is_narcotic: boolean;
  is_cold_chain: boolean;
  batch: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  prescribed_quantity: number;
  dispensed_quantity: number;
  is_dispensed?: boolean;
  unit_price: number | string;
  line_total: number | string;
  dosage_instruction: string;
  has_allergy_conflict: boolean;
  allergy_conflict_note: string | null;
  is_picked: boolean;
  substituted_medicine: string | null;
  substitution_note: string | null;
  suggested_fefo_batch?: {
    id: string;
    batch_number: string;
    expiry_date: string;
    available_quantity: number;
  } | null;
  total_available_stock?: number;
}

export interface TPADirectoryItem {
  id: string;
  name: string;
  code: string;
  standard_cover_pct: number;
  cashless_opd_enabled: boolean;
  requires_preauth: boolean;
  helpline: string;
  active: boolean;
}

export interface CorporateDirectoryItem {
  id: string;
  name: string;
  code: string;
  discount_pct: number;
  credit_limit: number;
  requires_letter: boolean;
  contact_officer: string;
  active: boolean;
}

export interface CreditAccountItem {
  id: string;
  account_name: string;
  category: string;
  employee_id: string;
  credit_limit: number;
  available_balance: number;
  allowed_authorizers: string[];
  auth_pin: string;
  active: boolean;
}

export interface IPDAdmissionStatus {
  admission_id: string | null;
  admission_number: string;
  is_admitted: boolean;
  patient_name?: string;
  uhid?: string;
  ward: string;
  bed: string;
  advance_deposit_total: number;
  cumulative_bill: number;
  deposit_utilization_pct: number;
  threshold_warning: boolean;
}

export interface ShiftDrawerSummary {
  shift_id?: string;
  counter_name: string;
  shift_type: string;
  pharmacist_name?: string;
  opening_float: number;
  cash_collected: number;
  card_collected: number;
  upi_collected: number;
  refunds_paid: number;
  net_drawer_cash: number;
  total_revenue: number;
  is_closed: boolean;
  opened_at?: string;
}

export interface SettlementPayload {
  settlement_mode: 'PAY_AT_PHARMACY' | 'PAY_AT_RECEPTION' | 'INSURANCE' | 'CORPORATE' | 'CREDIT' | 'IPD_RUNNING_BILL' | string;
  payment_method?: 'CASH' | 'CARD' | 'UPI' | string;
  amount_tendered?: number;
  payment_reference?: string;
  handover_policy?: 'PRE_PAID' | 'POST_PAID' | string;
  insurance_data?: {
    tpa_name?: string;
    policy_number?: string;
    preauth_code?: string;
    cover_rate?: number;
    copay_settled_at_counter?: boolean;
    copay_tender_mode?: string;
  };
  corporate_data?: {
    corporate_name?: string;
    employee_badge_id?: string;
    auth_letter_ref?: string;
    discount_rate?: number;
  };
  credit_data?: {
    account_name?: string;
    account_category?: string;
    authorizer_name?: string;
    authorizer_pin?: string;
    justification_note?: string;
  };
}

export interface QueueOrder {
  id: string;
  order_number: string;
  prescription: string | null;
  prescription_number: string | null;
  patient: string;
  patient_name: string;
  patient_uhid: string;
  patient_gender: string;
  patient_dob: string;
  patient_allergies: string[] | any[];
  encounter_type: 'OPD' | 'IPD' | 'OTC';
  ward_name: string | null;
  settlement_mode: 'PAY_AT_PHARMACY' | 'PAY_AT_RECEPTION' | 'IPD_RUNNING_BILL' | 'INSURANCE' | 'CORPORATE' | 'CREDIT' | string;
  payment_status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'INSURANCE_PENDING' | 'CORPORATE_PENDING' | 'CREDIT_AUTHORIZED' | string;
  payment_method: string | null;
  payment_reference: string | null;
  total_amount: number | string;
  co_pay_amount: number | string;
  payer_covered_amount: number | string;
  insurance_policy_number: string | null;
  token_slip_number?: string | null;
  handover_policy?: string | null;
  insurance_data?: any;
  corporate_data?: any;
  credit_data?: any;
  ipd_data?: any;
  receipt_data?: any;
  status: 'PENDING' | 'UNDER_REVIEW' | 'AWAITING_STOCK' | 'VERIFIED' | 'DISPENSED' | 'PARTIALLY_DISPENSED' | 'PURCHASED_OUTSIDE' | 'CANCELLED';
  prescription_outcome?: 'FULL_PURCHASE' | 'PARTIAL_PURCHASE' | 'PURCHASED_OUTSIDE' | 'DECIDE_LATER' | string;
  purchased_outside_reason?: 'PATIENT_CHOICE' | 'PRICE_CONCERN' | 'OUT_OF_STOCK' | 'INSURANCE_RESTRICTION' | string | null;
  purchased_outside_notes?: string | null;
  purchased_outside_at?: string | null;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  doctor_name: string;
  diagnosis: string;
  has_allergy_warning: boolean;
  allergy_warning_details: any[];
  allergy_override_reason: string | null;
  step: number;
  identity_confirmed: boolean;
  interaction_acknowledged: boolean;
  controlled_drug_data: any;
  counseling_data: any;
  hold_reason: string | null;
  dispensed_by_name: string | null;
  dispensed_at: string | null;
  created_at: string;
  items: QueueOrderItem[];
}

export interface OTCSaleLineItem {
  id?: string;
  medicine_id: string;
  medicine_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
  line_total: number;
  prescription_verified?: boolean;
}

export interface OTCSale {
  id: string;
  sale_number: string;
  customer_name: string;
  customer_phone: string;
  registered_patient: string | null;
  payment_mode: string;
  payment_reference: string | null;
  subtotal_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  cashier_settled: boolean;
  sold_by_name: string;
  created_at: string;
  items: any[];
}

export interface ReturnRecordItem {
  id: string;
  medicine: string;
  medicine_name: string;
  batch_number: string;
  quantity_returned: number;
  refund_unit_price: number | string;
  line_refund_total: number | string;
  action: 'RESTOCK' | 'QUARANTINE';
  action_notes?: string;
}

export interface ReturnRecord {
  id: string;
  return_number: string;
  original_dispense_order: string | null;
  original_otc_sale: string | null;
  original_reference: string;
  patient: string | null;
  patient_name: string;
  patient_uhid?: string;
  customer_name: string;
  return_type: string;
  status: 'Requested' | 'Inspected' | 'Refunded' | 'Rejected';
  total_refund_amount: number | string;
  reason: string;
  inspection_checks: Record<string, boolean>;
  disposition: 'restock' | 'quarantine' | null;
  refund_route: string;
  rejection_reason: string | null;
  non_returnable_note: string | null;
  processed_by_name: string;
  created_at: string;
  items: ReturnRecordItem[];
}

export interface CompletedItem {
  id: string;
  time: string;
  patient: string;
  uhid: string;
  doctor: string;
  items: string;
  items_sub: string;
  mode: string;
  pay: { text: string; bg: string; fg: string; bd: string };
  flags: { text: string; bg: string; fg: string }[];
  total_amount: number;
  lines: {
    id: string;
    name: string;
    batch: string;
    qty: number;
    unit_price: number;
    amt: number;
    is_cd: boolean;
    is_cold: boolean;
  }[];
}

export const pharmacyOpdService = {
  // 1. Dashboard KPIs
  async getOPDKPIs(): Promise<OPDKPIs> {
    const res = await api.get('/pharmacy/opd/kpis/');
    return res.data;
  },

  // 2. Queue Operations
  async getDispenseQueue(params?: { status?: string; pill?: string; q?: string }): Promise<QueueOrder[]> {
    const res = await api.get('/pharmacy/dispense-queue/', {
      params: {
        encounter_type: 'OPD',
        ...params,
      },
    });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  async getDispenseOrder(id: string): Promise<QueueOrder> {
    const res = await api.get(`/pharmacy/dispense-queue/${id}/`);
    return res.data;
  },

  async callNext(): Promise<QueueOrder> {
    const res = await api.post('/pharmacy/dispense-queue/call-next/');
    return res.data;
  },

  async claimOrder(id: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/claim/`);
    return res.data;
  },

  async setStep(id: string, step: number, data?: { identity_confirmed?: boolean; interaction_acknowledged?: boolean }): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/set-step/`, {
      step,
      ...data,
    });
    return res.data;
  },

  async overrideAllergy(id: string, reason: string, audit_remarks?: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/override-allergy/`, {
      reason,
      audit_remarks,
    });
    return res.data;
  },

  async setPaymentSource(id: string, settlement_mode: string, payer_info?: any): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/set-payment-source/`, {
      settlement_mode,
      payer_info,
    });
    return res.data;
  },

  async recordPayment(id: string, method: string, amount_received: number, reference?: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/record-payment/`, {
      method,
      amount_received,
      reference,
    });
    return res.data;
  },

  async verifyReceipt(id: string, receipt_no: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/verify-receipt/`, {
      receipt_no,
    });
    return res.data;
  },

  async verifyPayer(id: string, verified = true): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/verify-payer/`, {
      verified,
    });
    return res.data;
  },

  async holdOrder(id: string, reason?: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/hold/`, {
      reason,
    });
    return res.data;
  },

  async resumeOrder(id: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/resume/`);
    return res.data;
  },

  async substituteItem(id: string, item_id: string, new_medicine_id: string, reason?: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/substitute-item/`, {
      item_id,
      new_medicine_id,
      reason,
    });
    return res.data;
  },

  async dispenseOrder(id: string, payload?: {
    counseling?: any;
    picks?: any;
    cd_data?: any;
    settlement?: SettlementPayload;
    selected_item_ids?: string[];
  }): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/dispense/`, payload || {});
    return res.data;
  },

  async markPurchasedOutside(id: string, reason: string, notes?: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/purchased-outside/`, {
      reason,
      notes,
    });
    return res.data;
  },

  async setOutcome(id: string, outcome: string): Promise<QueueOrder> {
    const res = await api.post(`/pharmacy/dispense-queue/${id}/set-outcome/`, {
      outcome,
    });
    return res.data;
  },

  // 3. OTC Operations
  async getOTCSales(params?: { q?: string }): Promise<OTCSale[]> {
    const res = await api.get('/pharmacy/otc-sales/', { params });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  async createOTCSale(payload: {
    customer_name?: string;
    customer_phone?: string;
    patient_id?: string;
    payment_mode?: string;
    payment_reference?: string;
    items: {
      medicine_id: string;
      quantity: number;
      discount_percent?: number;
      prescription_verified?: boolean;
    }[];
  }): Promise<OTCSale> {
    const res = await api.post('/pharmacy/otc-sales/', payload);
    return res.data;
  },

  async sendWhatsAppInvoice(sale_id: string, phone?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/pharmacy/otc-sales/${sale_id}/send-whatsapp/`, { phone });
    return res.data;
  },

  // 4. Returns & Refunds
  async getReturns(params?: { status?: string; q?: string }): Promise<ReturnRecord[]> {
    const res = await api.get('/pharmacy/returns/', { params });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  async createReturn(payload: {
    dispense_order_id?: string;
    otc_sale_id?: string;
    order_item_id?: string;
    otc_item_id?: string;
    quantity: number;
    reason: string;
  }): Promise<ReturnRecord> {
    const res = await api.post('/pharmacy/returns/', payload);
    return res.data;
  },

  async inspectReturn(id: string, checks: Record<string, boolean>, disposition: 'restock' | 'quarantine'): Promise<ReturnRecord> {
    const res = await api.post(`/pharmacy/returns/${id}/inspect/`, {
      checks,
      disposition,
    });
    return res.data;
  },

  async processRefund(id: string): Promise<ReturnRecord> {
    const res = await api.post(`/pharmacy/returns/${id}/process-refund/`);
    return res.data;
  },

  async rejectReturn(id: string, reason: string): Promise<ReturnRecord> {
    const res = await api.post(`/pharmacy/returns/${id}/reject/`, { reason });
    return res.data;
  },

  // 5. Completed Today
  async getCompletedToday(params?: { q?: string }): Promise<CompletedItem[]> {
    const res = await api.get('/pharmacy/completed-today/', { params });
    return res.data;
  },

  // 6. Formulary & Stock Directory for lookup
  async getStockLookup(params?: { pill?: string; q?: string }): Promise<any[]> {
    const res = await api.get('/pharmacy/inventory/alerts/', { params });
    return res.data;
  },

  // 7. Phase 5: Billing Settlement Directories & Shift Drawer
  async getTPADirectory(): Promise<TPADirectoryItem[]> {
    const res = await api.get('/pharmacy/billing/tpa-directory/');
    return res.data;
  },

  async getCorporateDirectory(): Promise<CorporateDirectoryItem[]> {
    const res = await api.get('/pharmacy/billing/corporate-directory/');
    return res.data;
  },

  async getCreditAccounts(): Promise<CreditAccountItem[]> {
    const res = await api.get('/pharmacy/billing/credit-accounts/');
    return res.data;
  },

  async getIPDAdmissionStatus(uhidOrAdmission: string): Promise<IPDAdmissionStatus> {
    const res = await api.get('/pharmacy/billing/ipd-admission-status/', {
      params: { uhid: uhidOrAdmission },
    });
    return res.data;
  },

  async getShiftDrawer(counterName?: string): Promise<ShiftDrawerSummary> {
    const res = await api.get('/pharmacy/billing/shift-drawer/', {
      params: counterName ? { counter_name: counterName } : {},
    });
    return res.data;
  },

  async closeShiftDrawer(counterName?: string): Promise<{ success: boolean; shift: any }> {
    const res = await api.post('/pharmacy/billing/shift-drawer/', {
      action: 'close',
      counter_name: counterName || 'Counter 2 · Main OPD',
    });
    return res.data;
  },

  async clearReceptionWebhook(tokenSlip: string, receiptNo: string, amountPaid?: number): Promise<{ success: boolean; message: string; order: QueueOrder }> {
    const res = await api.post('/pharmacy/billing/reception-webhook/', {
      token_slip_number: tokenSlip,
      receipt_number: receiptNo,
      amount_paid: amountPaid,
    });
    return res.data;
  },
};

