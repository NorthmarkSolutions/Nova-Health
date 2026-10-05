import api from './api';

export interface TariffItem {
  id: string;
  code: string;
  name: string;
  department: string;
  base_price: string | number;
  emergency_markup_percent: string | number;
  gst_rate: string | number;
  is_active: boolean;
  created_at?: string;
}

export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  package_price: string | number;
  department: string;
  inclusions_description: string;
  exclusions_description: string;
  validity_days: number;
  is_active: boolean;
  created_at?: string;
}

export interface CorporateAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'CORPORATE' | 'TPA_INSURANCE';
  credit_limit: string | number;
  utilized_credit: string | number;
  co_pay_percentage: string | number;
  deductible_amount: string | number;
  room_rent_ceiling: string | number;
  valid_until?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface QuoteItemRequest {
  service_code?: string;
  code?: string;
  description?: string;
  department?: string;
  qty: number;
  unit_price?: number;
  discount_amount?: number;
  tax_rate?: number;
}

export interface CalculatedQuoteItem {
  service_code: string;
  description: string;
  department: string;
  qty: number;
  unit_price: number | string;
  markup_amount: number | string;
  discount_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
}

export interface QuotationResult {
  items: CalculatedQuoteItem[];
  gross_total: string;
  total_discount: string;
  subtotal: string;
  total_tax: string;
  net_payable: string;
  patient_responsibility: string;
  sponsor_responsibility: string;
  corporate_name?: string | null;
  is_emergency: boolean;
}

export interface BillingInvoiceItem {
  id?: string;
  source: string;
  department?: string;
  service_code?: string;
  description: string;
  qty: number;
  unitPrice: number | string;
  discount_percent?: number | string;
  discount_amount?: number | string;
  tax_rate?: number | string;
  tax_amount?: number | string;
  total: number | string;
  source_reference_id?: string;
}

export interface BillingInvoice {
  id: string;
  invNo: string;
  invoice_number?: string;
  patient?: string;
  patientName: string;
  uhid: string;
  phone?: string;
  category: string;
  encounter_type?: string;
  date: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  advanceDeducted: string | number;
  total: string | number;
  paid: string | number;
  balance: string | number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'INSURANCE_PENDING' | 'CORPORATE_PENDING';
  settlement_mode?: string;
  token_slip_number?: string;
  tpa_claim_reference?: string;
  corporate_reference?: string;
  counterCode?: string;
  cashierName?: string;
  items: BillingInvoiceItem[];
  payments?: any[];
  created_at?: string;
}

export const billingService = {
  // --- TARIFF MASTER ---
  async getTariffs(params?: { department?: string; search?: string; is_active?: boolean }): Promise<TariffItem[]> {
    const res = await api.get('/billing/tariffs', { params });
    return res.data;
  },

  async createTariff(data: Partial<TariffItem>): Promise<TariffItem> {
    const res = await api.post('/billing/tariffs', data);
    return res.data;
  },

  async updateTariff(idOrCode: string, data: Partial<TariffItem>): Promise<TariffItem> {
    const res = await api.patch(`/billing/tariffs/${idOrCode}`, data);
    return res.data;
  },

  async deactivateTariff(idOrCode: string): Promise<{ message: string }> {
    const res = await api.delete(`/billing/tariffs/${idOrCode}`);
    return res.data;
  },

  // --- SERVICE PACKAGES ---
  async getPackages(params?: { department?: string; search?: string }): Promise<ServicePackage[]> {
    const res = await api.get('/billing/packages', { params });
    return res.data;
  },

  async createPackage(data: Partial<ServicePackage>): Promise<ServicePackage> {
    const res = await api.post('/billing/packages', data);
    return res.data;
  },

  async updatePackage(idOrCode: string, data: Partial<ServicePackage>): Promise<ServicePackage> {
    const res = await api.patch(`/billing/packages/${idOrCode}`, data);
    return res.data;
  },

  // --- CORPORATE & TPA ACCOUNTS ---
  async getCorporateAccounts(params?: { type?: string }): Promise<CorporateAccount[]> {
    const res = await api.get('/billing/corporate-accounts', { params });
    return res.data;
  },

  async createCorporateAccount(data: Partial<CorporateAccount>): Promise<CorporateAccount> {
    const res = await api.post('/billing/corporate-accounts', data);
    return res.data;
  },

  async updateCorporateAccount(idOrCode: string, data: Partial<CorporateAccount>): Promise<CorporateAccount> {
    const res = await api.patch(`/billing/corporate-accounts/${idOrCode}`, data);
    return res.data;
  },

  // --- DYNAMIC QUOTATION CALCULATOR ---
  async calculateQuote(payload: {
    items: QuoteItemRequest[];
    encounter_type?: string;
    patient_category?: string;
    is_emergency?: boolean;
    corporate_account_id?: string;
  }): Promise<QuotationResult> {
    const res = await api.post('/billing/pricing/calculate-quote', payload);
    return res.data;
  },

  // --- INVOICES & PAYMENTS ---
  async getInvoices(params?: { status?: string; uhid?: string; category?: string }): Promise<BillingInvoice[]> {
    const res = await api.get('/billing/invoices', { params });
    return res.data;
  },

  async getInvoice(id: string): Promise<BillingInvoice> {
    const res = await api.get(`/billing/invoices/${id}`);
    return res.data;
  },

  async createInvoice(data: any): Promise<BillingInvoice> {
    const res = await api.post('/billing/invoices', data);
    return res.data;
  },

  async recordPayment(data: {
    invoiceId: string;
    amount: number | string;
    tenderMode?: string;
    paymentMethod?: string;
    transactionReference?: string;
    card_network?: string;
    card_last_four?: string;
    auth_code?: string;
    upi_vpa?: string;
    cheque_number?: string;
    cheque_bank?: string;
  }): Promise<any> {
    const res = await api.post('/billing/payments', data);
    return res.data;
  },

  // --- PHASE 3: CASHIER WORKSPACE & POS METHODS ---
  async getCashierQueue(params?: { department?: string; search?: string }): Promise<CashierQueueItem[]> {
    const res = await api.get('/billing/cashier/queue', { params });
    return res.data;
  },

  async processMultiTenderPayment(data: {
    invoice_id: string;
    split_payments: MultiTenderSplit[];
    counter_code?: string;
    notes?: string;
  }): Promise<MultiTenderPaymentResponse> {
    const res = await api.post('/billing/payments/multi-tender', data);
    return res.data;
  },

  async openShift(data: { counter_code?: string; opening_float: number }): Promise<any> {
    const res = await api.post('/billing/shifts/open', data);
    return res.data;
  },

  async getCurrentShift(counter_code?: string): Promise<ShiftSummary> {
    const res = await api.get('/billing/shifts/current', { params: { counter_code } });
    return res.data;
  },

  async closeShift(data: {
    shift_id?: string;
    physical_cash_count: number;
    denominations?: Record<string, number>;
    notes?: string;
  }): Promise<any> {
    const res = await api.post('/billing/shifts/close', data);
    return res.data;
  },

  async getInvoiceReceipt(invoiceId: string): Promise<InvoiceReceiptData> {
    const res = await api.get(`/billing/invoices/${invoiceId}/receipt`);
    return res.data;
  }
};

export interface CashierQueueItem {
  id: string;
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  phone: string;
  department: string;
  encounter_type: string;
  category: string;
  status: string;
  created_at: string;
  items_count: number;
  subtotal: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  patient_deposits_available: number;
  summary_services: string;
  items: Array<{
    id: string;
    description: string;
    qty: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    department: string;
  }>;
}

export interface MultiTenderSplit {
  tender_mode: 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'DEPOSIT_DEDUCTION';
  amount: number;
  transaction_reference?: string;
  card_network?: string;
  card_last_four?: string;
  auth_code?: string;
  upi_vpa?: string;
  cheque_number?: string;
  cheque_bank?: string;
  notes?: string;
}

export interface MultiTenderPaymentResponse {
  invoice: BillingInvoice;
  payments: any[];
  total_paid_now: number;
  remaining_balance: number;
  receipt_token: string;
  status: string;
}

export interface ShiftSummary {
  has_active_shift: boolean;
  shift_id: string | null;
  shift_number: string | null;
  counter_code: string | null;
  counter_name: string | null;
  cashier_name: string | null;
  started_at: string | null;
  opening_float: number;
  cash_collected: number;
  card_collected: number;
  upi_collected: number;
  other_collected: number;
  total_collected: number;
  expected_cash_in_drawer: number;
  invoices_settled_count: number;
  status: string;
  cash_variance?: number;
  closed_at?: string;
  reconciled_by?: string;
}

export interface InvoiceReceiptData {
  hospital: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
  };
  invoice: {
    id: string;
    invoice_number: string;
    date: string;
    category: string;
    encounter_type: string;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    advance_deducted: number;
    total: number;
    paid: number;
    balance: number;
    token_slip_number: string;
    counter: string;
    cashier: string;
  };
  patient: {
    id: string;
    uhid: string;
    name: string;
    phone: string;
    gender: string;
    date_of_birth: string;
  };
  items: Array<{
    sr: number;
    description: string;
    department: string;
    qty: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
  }>;
  payments: Array<{
    id: string;
    receipt_number: string;
    tender_mode: string;
    amount: number;
    date: string;
    transaction_reference: string;
    card_info: string;
    cashier: string;
  }>;
  printed_at: string;
  receipt_token: string;
}

