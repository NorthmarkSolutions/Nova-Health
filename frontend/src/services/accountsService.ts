import api from './api';

/** GET /accounts/audit/integrity/ — hash-chain verification of the audit log. */
export interface AuditIntegrity {
  status: string;
  valid: boolean;
  total_records: number;
  last_sequence?: number;
  head_hash?: string;
  error?: string;
  broken_at_sequence?: number;
  days?: Array<{ date: string; records: number; valid: boolean }>;
}

export interface ChartOfAccountItem {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  sub_type: string;
  is_control_account: boolean;
  control_for: string;
  is_postable: boolean;
  active: boolean;
}

export interface CostCenterItem {
  id: string;
  code: string;
  name: string;
  department_id: string;
  active: boolean;
}

export interface DelegationLimitItem {
  id: string;
  policy_version_id: string;
  role: string;
  document_type: string;
  max_amount: string | null;
  requires_cosign_role: string;
  cosign_above_amount: string | null;
}

export interface PeriodLockItem {
  id: string;
  period_type: string;
  period_key: string;
  status: 'open' | 'soft_closed' | 'close_pending' | 'close_approved' | 'locked' | 'reopen_requested' | 'reopened';
}

export interface JournalLineItem {
  id?: string;
  line_no?: number;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: string | number;
  credit: string | number;
  cost_center_id?: string;
  cost_center_code?: string;
  department_id?: string;
  narration?: string;
}

export interface JournalVoucher {
  id: string;
  reference_no: string;
  journal_date: string;
  posting_period: string;
  entry_type: string;
  source: string;
  description: string;
  external_reference?: string;
  total_debit: string;
  total_credit: string;
  status: 'draft' | 'submitted' | 'returned' | 'in_approval' | 'approved' | 'posted' | 'rejected' | 'reversed';
  maker_name?: string;
  created_at: string;
  lines: JournalLineItem[];
  version: number;
}

export interface ApprovalRequestItem {
  id: string;
  document_type: string;
  document_id: string;
  reference_no: string;
  amount: string;
  maker_name: string;
  current_level: 'supervisor' | 'manager' | 'controller' | 'cfo' | 'board';
  current_approver_role: string;
  priority: 'high' | 'medium' | 'low';
  risk_flags: string[];
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'forwarded' | 'escalated' | 'withdrawn';
  submitted_at: string;
  version: number;
  steps?: Array<{
    step_no: number;
    level: string;
    actor_name: string;
    decision: string;
    comment: string;
    decided_at: string;
  }>;
}

export interface WorkloadResponse {
  queues: {
    journals_pending: number;
    approvals_pending: number;
    my_requests_pending: number;
    events_pending_validation: number;
    escalations_open: number;
    tasks_open: number;
    total_actionable: number;
  };
}

export interface AuditLogItem {
  id: string;
  actor_name: string;
  actor_role: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reference_no: string;
  previous_hash: string;
  entry_hash: string;
  occurred_at: string;
}

export interface FinancialEventItem {
  id: string;
  event_id: string;
  event_type: string;
  source_department: string;
  source_reference: string;
  business_date: string;
  amount: string;
  payload: any;
  status: 'received' | 'pending_validation' | 'validated' | 'rejected_technical' | 'rejected_business' | 'posted';
  rejection_reason?: string;
  created_at: string;
}

export interface VendorBillItem {
  id: string;
  reference_no: string;
  vendor: {
    id: string;
    name: string;
    gstin: string;
    payment_terms_days: number;
  };
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  po_no?: string;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  tds_amount: string;
  total_amount: string;
  net_payable: string;
  status: 'draft' | 'submitted' | 'returned' | 'in_approval' | 'approved' | 'on_hold' | 'scheduled' | 'paid' | 'rejected' | 'cancelled';
  payment_priority: string;
  duplicate_score: number;
  version: number;
  three_way_match?: {
    po_no: string;
    grn_no: string;
    result: string;
    variance_amount: string;
    variance_pct: string;
  };
}

export interface BankTransactionItem {
  id: string;
  bank_account: string;
  bank_reference: string;
  txn_date: string;
  value_date: string;
  narration: string;
  amount: string;
  direction: 'credit' | 'debit';
  type: string;
  match_status: 'unmatched' | 'suggested' | 'matched' | 'for_review' | 'excluded';
  suggested_matches?: BankSuggestion[];
}

/** One candidate ledger entry for a bank line (server: BankReconciliationService.suggest_matches). */
export interface BankSuggestion {
  matched_type: string;
  matched_id: string;
  reference_no: string;
  amount: string;
  date: string;
  confidence: number;
  difference: string;
}

export interface AccountDocumentItem {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  uploaded_by_name: string;
  validated: boolean;
  rejection_reason: string;
  checksum: string;
  created_at: string;
}

export interface ReceivableItem {
  id: string;
  reference_no: string;
  receivable_type: string;
  customer?: {
    id: string;
    name: string;
    source_type: string;
  };
  patient_name?: string;
  invoice_date: string;
  due_date: string;
  original_amount: string;
  settled_amount: string;
  outstanding_amount: string;
  aging_bucket: '0_30' | '31_60' | '61_90' | '90_plus';
  status: 'open' | 'partially_settled' | 'settled' | 'disputed' | 'written_off';
  last_followup_at?: string;
  followups?: Array<{
    id: string;
    channel: string;
    contact_person: string;
    outcome: string;
    notes: string;
    created_at: string;
    logged_by_name: string;
  }>;
}

export interface CollectionCaseItem {
  id: string;
  customer: {
    id: string;
    name: string;
    source_type: string;
  };
  stage: 'due_today' | 'promised' | 'followup_required' | 'escalated' | 'recovered';
  outstanding_amount: string;
  next_action: string;
  next_action_on?: string;
  recovery_priority: string;
  escalated: boolean;
  followups?: any[];
}

export interface ExpenseRequestItem {
  id: string;
  reference_no: string;
  department_id: string;
  requested_by_staff: string;
  expense_type: string;
  amount: string;
  business_reason: string;
  budget_available_at_submit: string;
  status: 'draft' | 'in_approval' | 'approved' | 'rejected' | 'returned';
  created_at: string;
  cost_center_code?: string;
  maker_name?: string;
}

export interface GSTBatchItem {
  id: string;
  reference_no: string;
  direction: 'outward' | 'inward_itc';
  period_from: string;
  period_to: string;
  invoice_count: number;
  taxable_value: string;
  tax_value: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  lines?: Array<{
    id: string;
    invoice_no: string;
    invoice_date: string;
    gstin: string;
    taxable_value: string;
    cgst: string;
    sgst: string;
    hsn_sac: string;
  }>;
}

/** GET /accounts/supervisor/dashboard/ — counts and alerts computed by the server. */
export interface SupervisorDashboardResponse {
  kpis: {
    pending_approvals: number;
    pending_value: string;
    returned_today: number;
    escalations: number;
    overdue_reviews: number;
    pending_gst: number;
    daily_close_status: string;
    blocker_count: number;
  };
  alerts: Array<{ t: string; d: string; severity: 'critical' | 'warning' | 'info' | string }>;
  exceptions: Array<{ ref: string; t: string; severity: string }>;
}

/** GET /accounts/close/daily/<date>/ */
export interface DailyCloseResponse {
  business_date: string;
  date_formatted: string;
  status: 'open' | 'closed' | 'locked' | string;
  blockers: string[];
  blocker_count: number;
  sections: Array<{ title: string; screen: string; done: number; total: number; pct: string; note: string }>;
  checks: Array<{ title: string; ok: boolean; desc: string }>;
}

export interface EscalationItem {
  id: string;
  reference_no: string;
  type: string;
  reason: string;
  entity_type: string;
  entity_id: string;
  raised_by_name: string;
  raised_to: string;
  amount: string;
  status: 'open' | 'with_manager' | 'resolved' | 'closed' | string;
  /** Normalised from the server's {who, when, t}. */
  notes: Array<{ author: string; when: string; text: string }>;
  resolution: string;
  created_at: string;
}

export interface TeamPerformanceMember {
  name: string;
  code: string;
  processed: number;
  pending: number;
  approved: number;
  returned: number;
  errors: number;
  first_pass: string;
  productivity: string;
  collections_count: number;
}

export interface WriteOffRequestItem {
  id: string;
  reference_no: string;
  customer_name: string;
  receivable_ref: string;
  amount: string;
  reason: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded' | string;
  created_at: string;
}

export interface ReconciliationMatchItem {
  id: string;
  bank_transaction: string;
  matched_type: string;
  matched_id: string;
  confidence: number;
  method: string;
  status: string;
  proposed_by_name: string;
  created_at: string;
}

// ---- Map API rows to the shape the screens read (HMS bible 19.9) ----
// The serializers return FK ids plus *_name fields; the screens read nested objects.
const listOf = (data: any): any[] => (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);

const normaliseSuggestion = (s: any): BankSuggestion => ({
  matched_type: s?.matched_type || 'receipt',
  matched_id: String(s?.matched_id ?? s?.target_id ?? ''),
  reference_no: s?.reference_no || s?.reference || '',
  amount: String(s?.amount ?? '0'),
  date: s?.date || '',
  confidence: Number(s?.confidence) || 0,
  difference: String(s?.difference ?? '0'),
});

const normaliseBill = (b: any): VendorBillItem => ({
  ...b,
  vendor:
    b?.vendor && typeof b.vendor === 'object'
      ? b.vendor
      : { id: b?.vendor ? String(b.vendor) : '', name: b?.vendor_name || '', gstin: b?.vendor_gstin || '', payment_terms_days: 0 },
  duplicate_score: Number(b?.duplicate_score) || 0,
});

const normaliseReceivable = (r: any): ReceivableItem => ({
  ...r,
  customer:
    r?.customer && typeof r.customer === 'object'
      ? r.customer
      : r?.customer || r?.customer_name
        ? { id: r?.customer ? String(r.customer) : '', name: r?.customer_name || '', source_type: r?.receivable_type || '' }
        : undefined,
});

const normaliseCase = (c: any): CollectionCaseItem => ({
  ...c,
  customer:
    c?.customer && typeof c.customer === 'object'
      ? c.customer
      : { id: c?.customer ? String(c.customer) : '', name: c?.customer_name || '', source_type: '' },
});

const normaliseBankTxn = (t: any): BankTransactionItem => ({
  ...t,
  bank_account: t?.bank_account != null ? String(t.bank_account) : '',
  suggested_matches: Array.isArray(t?.suggested_matches) ? t.suggested_matches.map(normaliseSuggestion) : [],
});

const normaliseEscalation = (e: any): EscalationItem => ({
  ...e,
  raised_by_name: e?.raised_by_full_name || e?.raised_by_name || '',
  resolution: e?.resolution || e?.resolution_summary || '',
  notes: (Array.isArray(e?.notes) ? e.notes : []).map((n: any) => ({ author: n?.who || n?.author || '', when: n?.when || n?.timestamp || '', text: n?.t || n?.text || '' })),
});

export const accountsService = {
  getWorkload: async (): Promise<WorkloadResponse> => {
    const res = await api.get('/accounts/me/workload');
    return res.data;
  },

  getExecutiveDashboard: async (): Promise<any> => {
    const res = await api.get('/accounts/me/dashboard');
    return res.data;
  },

  getCOA: async (params?: { postable?: boolean; q?: string }): Promise<ChartOfAccountItem[]> => {
    const res = await api.get('/accounts/coa', { params });
    return res.data;
  },

  getCostCenters: async (): Promise<CostCenterItem[]> => {
    const res = await api.get('/accounts/cost-centers');
    return res.data;
  },

  getDelegationLimits: async (): Promise<DelegationLimitItem[]> => {
    const res = await api.get('/accounts/delegation-limits');
    return res.data;
  },

  getPeriods: async (): Promise<PeriodLockItem[]> => {
    const res = await api.get('/accounts/periods');
    return res.data;
  },

  getJournals: async (params?: { status?: string; maker?: string; period?: string; q?: string }): Promise<JournalVoucher[]> => {
    const res = await api.get('/accounts/journals/', { params });
    return res.data.results || res.data;
  },

  createJournal: async (payload: {
    journal_date: string;
    description: string;
    lines: Array<{ account_id: string; debit: number; credit: number; cost_center_id?: string; narration?: string }>;
    entry_type?: string;
    external_reference?: string;
  }): Promise<JournalVoucher> => {
    const res = await api.post('/accounts/journals/', payload);
    return res.data;
  },

  submitJournal: async (journalId: string, version: number = 1): Promise<any> => {
    const res = await api.post(`/accounts/journals/${journalId}/submit/`, { version });
    return res.data;
  },

  reverseJournal: async (journalId: string, payload: { reversal_date: string; reason: string }): Promise<any> => {
    const res = await api.post(`/accounts/journals/${journalId}/reverse/`, payload);
    return res.data;
  },

  getApprovalRequests: async (params?: { approver_role?: string; maker?: string; status?: string; type?: string }): Promise<ApprovalRequestItem[]> => {
    const res = await api.get('/accounts/approval-requests/', { params });
    return res.data.results || res.data;
  },

  processDecision: async (
    approvalRequestId: string,
    payload: {
      decision: 'approve' | 'approve_and_forward' | 'return' | 'reject' | 'forward' | 'escalate';
      comment?: string;
      reason_code?: string;
      acknowledgements?: string[];
      version?: number;
    }
  ): Promise<any> => {
    const res = await api.post(`/accounts/approval-requests/${approvalRequestId}/decision/`, payload);
    return res.data;
  },

  getAuditActivity: async (): Promise<AuditLogItem[]> => {
    const res = await api.get('/accounts/audit/activity/');
    return res.data;
  },

  getAuditIntegrity: async (): Promise<AuditIntegrity> => {
    const res = await api.get('/accounts/audit/integrity/');
    return res.data;
  },

  // === Phase 2: Executive APIs ===
  getEvents: async (params?: { status?: string; source?: string }): Promise<FinancialEventItem[]> => {
    const res = await api.get('/accounts/events/', { params });
    return res.data.results || res.data;
  },

  validateEvent: async (eventId: string, comment?: string): Promise<any> => {
    const res = await api.post(`/accounts/events/${eventId}/validate/`, { comment });
    return res.data;
  },

  rejectEvent: async (eventId: string, comment: string): Promise<any> => {
    const res = await api.post(`/accounts/events/${eventId}/reject/`, { comment });
    return res.data;
  },

  getVendorBills: async (params?: { status?: string }): Promise<VendorBillItem[]> => {
    const res = await api.get('/accounts/vendor-bills/', { params });
    return listOf(res.data).map(normaliseBill);
  },

  checkDuplicateBill: async (params: { vendor_id: string; invoice_no: string; amount: number; invoice_date?: string }): Promise<any> => {
    const res = await api.get('/accounts/vendor-bills/duplicate-check/', { params });
    return res.data;
  },

  createVendorBill: async (payload: any): Promise<VendorBillItem> => {
    const res = await api.post('/accounts/vendor-bills/', payload);
    return normaliseBill(res.data);
  },

  submitVendorBill: async (billId: string, ackDuplicate: boolean = false, version: number = 1): Promise<any> => {
    const res = await api.post(`/accounts/vendor-bills/${billId}/submit/`, { ack_duplicate: ackDuplicate, version });
    return res.data;
  },

  getBankTransactions: async (params?: { status?: string }): Promise<BankTransactionItem[]> => {
    const res = await api.get('/accounts/bank-transactions/', { params });
    return listOf(res.data).map(normaliseBankTxn);
  },

  getBankSuggestions: async (txnId: string): Promise<BankSuggestion[]> => {
    const res = await api.get(`/accounts/bank-transactions/${txnId}/suggestions/`);
    return listOf(res.data?.suggestions ?? res.data).map(normaliseSuggestion);
  },

  matchBankTransaction: async (payload: { bank_transaction_id: string; matched_type: string; matched_id: string; confidence: number; method: string }): Promise<any> => {
    const res = await api.post('/accounts/reconciliation/matches/', payload);
    return res.data;
  },

  flagBankTransaction: async (txnId: string): Promise<any> => {
    const res = await api.post(`/accounts/bank-transactions/${txnId}/flag/`);
    return res.data;
  },

  getReceivables: async (params?: { aging_bucket?: string; status?: string }): Promise<ReceivableItem[]> => {
    const res = await api.get('/accounts/receivables/', { params });
    return listOf(res.data).map(normaliseReceivable);
  },

  logReceivableFollowup: async (receivableId: string, payload: { channel: string; contact_person?: string; outcome?: string; notes?: string; next_action_on?: string }): Promise<any> => {
    const res = await api.post(`/accounts/receivables/${receivableId}/followups/`, payload);
    return res.data;
  },

  getCollectionPipeline: async (): Promise<CollectionCaseItem[]> => {
    const res = await api.get('/accounts/collections/pipeline');
    return listOf(res.data).map(normaliseCase);
  },

  validateDocument: async (id: string, valid: boolean, reason?: string): Promise<AccountDocumentItem> => {
    const res = await api.post(`/accounts/documents/${id}/validate/`, { valid, reason });
    return res.data;
  },

  getReconciliationMatches: async (): Promise<ReconciliationMatchItem[]> => {
    const res = await api.get('/accounts/reconciliation/matches/');
    return listOf(res.data);
  },

  /** Department audit trail as raw log rows (the Manager screen uses getRecentAudit's AuditRecord shape). */
  getDepartmentAudit: async (days: number = 31): Promise<AuditLogItem[]> => {
    const res = await api.get('/accounts/audit/recent/', { params: { days } });
    return listOf(res.data);
  },

  getDocuments: async (): Promise<AccountDocumentItem[]> => {
    const res = await api.get('/accounts/documents/');
    return listOf(res.data);
  },

  getExpenseRequests: async (params?: { status?: string }): Promise<ExpenseRequestItem[]> => {
    const res = await api.get('/accounts/expense-requests/', { params });
    return res.data.results || res.data;
  },

  createExpenseRequest: async (payload: any): Promise<ExpenseRequestItem> => {
    const res = await api.post('/accounts/expense-requests/', payload);
    return res.data;
  },

  submitExpenseRequest: async (id: string): Promise<any> => {
    const res = await api.post(`/accounts/expense-requests/${id}/submit/`);
    return res.data;
  },

  getGSTBatches: async (): Promise<GSTBatchItem[]> => {
    const res = await api.get('/accounts/gst/batches/');
    return res.data.results || res.data;
  },

  validateGSTIN: async (gstin: string): Promise<{ valid: boolean; state_code?: string; reason?: string }> => {
    const res = await api.post('/accounts/gst/batches/validate-gstin/', { gstin });
    return res.data;
  },

  submitGSTBatch: async (batchId: string): Promise<any> => {
    const res = await api.post(`/accounts/gst/batches/${batchId}/submit/`);
    return res.data;
  },

  // === Phase 3: Supervisor APIs ===
  getSupervisorDashboard: async (): Promise<SupervisorDashboardResponse> => {
    const res = await api.get('/accounts/supervisor/dashboard/');
    return res.data;
  },

  getDailyClose: async (dateStr: string): Promise<DailyCloseResponse> => {
    const res = await api.get(`/accounts/close/daily/${dateStr}/`);
    return res.data;
  },

  runDailyClose: async (dateStr: string): Promise<any> => {
    const res = await api.post(`/accounts/close/daily/${dateStr}/run/`);
    return res.data;
  },

  lockDailyOperations: async (dateStr: string): Promise<any> => {
    const res = await api.post(`/accounts/close/daily/${dateStr}/lock/`);
    return res.data;
  },

  escalateDailyClose: async (dateStr: string, comment: string): Promise<any> => {
    const res = await api.post(`/accounts/close/daily/${dateStr}/escalate/`, { comment });
    return res.data;
  },

  getEscalations: async (params?: { status?: string }): Promise<EscalationItem[]> => {
    const res = await api.get('/accounts/escalations/', { params });
    return listOf(res.data).map(normaliseEscalation);
  },

  addEscalationNote: async (id: string, note: string): Promise<any> => {
    const res = await api.post(`/accounts/escalations/${id}/notes/`, { note });
    return res.data;
  },

  forwardEscalation: async (id: string, comment: string): Promise<any> => {
    const res = await api.post(`/accounts/escalations/${id}/forward/`, { comment });
    return res.data;
  },

  resolveEscalation: async (id: string, resolution: string): Promise<any> => {
    const res = await api.post(`/accounts/escalations/${id}/resolve/`, { resolution });
    return res.data;
  },

  reassignCollectionOwner: async (caseId: string, owner: string): Promise<any> => {
    const res = await api.post(`/accounts/collections/${caseId}/owner/`, { owner });
    return res.data;
  },

  getWriteOffRequests: async (params?: { status?: string }): Promise<WriteOffRequestItem[]> => {
    const res = await api.get('/accounts/write-offs/', { params });
    return listOf(res.data);
  },

  decideWriteOff: async (id: string, payload: { decision: 'approve' | 'reject' | 'forward'; comment?: string }): Promise<any> => {
    const res = await api.post(`/accounts/write-offs/${id}/decision/`, payload);
    return res.data;
  },

  getTeamPerformance: async (level: string = 'executive'): Promise<TeamPerformanceMember[]> => {
    const res = await api.get('/accounts/team/performance/', { params: { level } });
    return listOf(res.data?.members ?? res.data);
  },

  decideReconciliationMatch: async (matchId: string, payload: { decision: 'approve' | 'return' | 'escalate'; comment?: string }): Promise<any> => {
    const res = await api.post(`/accounts/reconciliation/matches/${matchId}/decision/`, payload);
    return res.data;
  },

  decideGSTBatch: async (batchId: string, payload: { decision: 'approve' | 'return' | 'escalate'; comment?: string }): Promise<any> => {
    const res = await api.post(`/accounts/gst/batches/${batchId}/decision/`, payload);
    return res.data;
  },

  // === Phase 4: Accounts Manager APIs ===
  getManagerDashboard: async (): Promise<ManagerDashboardData> => {
    const res = await api.get('/accounts/manager/dashboard/');
    return res.data;
  },

  getManagerQueue: async (status: string = 'pending,escalated,approved,returned,rejected'): Promise<ApprovalRequestItem[]> => {
    const res = await api.get('/accounts/approval-requests/', { params: { approver_role: 'ACCOUNTS_MANAGER', status } });
    return res.data.results || res.data;
  },

  getReceivablesSummary: async (groupBy: 'payer' | 'department' | 'aging' = 'payer'): Promise<SummaryGroup[]> => {
    const res = await api.get('/accounts/receivables/summary/', { params: { group_by: groupBy } });
    return res.data;
  },

  getReceivablesPayers: async (): Promise<PayerItem[]> => {
    const res = await api.get('/accounts/receivables/payers/');
    return res.data;
  },

  setReceivablePriority: async (payerId: string, priority: string): Promise<PayerItem> => {
    const res = await api.post(`/accounts/receivables/${payerId}/priority/`, { priority });
    return res.data;
  },

  escalateReceivableCollection: async (payerId: string, reason: string): Promise<{ status: string; escalation_id?: string }> => {
    const res = await api.post(`/accounts/receivables/${payerId}/escalate-collection/`, { reason });
    return res.data;
  },

  decidePayerWriteOff: async (payerId: string, decision: 'approve' | 'reject', comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/receivables/${payerId}/write-off/decision/`, { decision, comment });
    return res.data;
  },

  getPayablesSummary: async (groupBy: 'vendor' | 'department' | 'category' = 'vendor'): Promise<SummaryGroup[]> => {
    const res = await api.get('/accounts/payables/summary/', { params: { group_by: groupBy } });
    return res.data;
  },

  getPayableBills: async (): Promise<PayableBill[]> => {
    const res = await api.get('/accounts/payables/bills/');
    return res.data;
  },

  setVendorBillPaymentPriority: async (billId: string, priority: string): Promise<PayableBill | { status: string }> => {
    const res = await api.post(`/accounts/vendor-bills/${billId}/payment-priority/`, { priority });
    return res.data;
  },

  decideVendorBill: async (billId: string, decision: 'approve' | 'hold' | 'forward', comment?: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/vendor-bills/${billId}/decision/`, { decision, comment });
    return res.data;
  },

  escalateVendorIssue: async (billId: string, reason: string): Promise<{ status: string; escalation_id: string }> => {
    const res = await api.post(`/accounts/vendor-bills/${billId}/escalate-vendor/`, { reason });
    return res.data;
  },

  getCashflowProjection: async (days: number = 30, bufferCr: number = 5): Promise<CashflowProjection> => {
    const res = await api.get('/accounts/cashflow/projection/', { params: { days, buffer_cr: bufferCr } });
    return res.data;
  },

  getHighValueTransactions: async (min: number = 100000): Promise<HighValueTransaction[]> => {
    const res = await api.get('/accounts/transactions/high-value/', { params: { min } });
    return res.data;
  },

  decideHighValueTransaction: async (id: string, decision: 'approve' | 'hold' | 'forward', comment?: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/transactions/high-value/${encodeURIComponent(id)}/decision/`, { decision, comment });
    return res.data;
  },

  flagHighValueTransaction: async (id: string, reason: string): Promise<{ status: string; exception_no?: string }> => {
    const res = await api.post(`/accounts/transactions/high-value/${encodeURIComponent(id)}/flag-for-review/`, { reason });
    return res.data;
  },

  getDepartmentBudgets: async (fy: string = 'FY2026-27'): Promise<DepartmentBudget[]> => {
    const res = await api.get('/accounts/budgets/departments/', { params: { fy } });
    return res.data;
  },

  requestBudgetExplanation: async (dept: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/budgets/${encodeURIComponent(dept)}/explanation-requests/`, { comment });
    return res.data;
  },

  escalateBudgetOverrun: async (dept: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/budgets/${encodeURIComponent(dept)}/escalate-overrun/`, { comment });
    return res.data;
  },

  getCostCenterAnalysis: async (period: 'Monthly' | 'Quarterly' | 'Yearly' = 'Monthly'): Promise<CostCenterAnalysis> => {
    const res = await api.get('/accounts/analytics/cost-centers/', { params: { period } });
    return res.data;
  },

  getFinancialExceptions: async (): Promise<FinancialExceptionItem[]> => {
    const res = await api.get('/accounts/exceptions/');
    return res.data;
  },

  actOnFinancialException: async (
    exceptionNo: string,
    action: 'assign' | 'investigate' | 'escalate' | 'close',
    payload: { owner?: string; comment?: string } = {}
  ): Promise<{ status: string }> => {
    const res = await api.post(`/accounts/exceptions/${encodeURIComponent(exceptionNo)}/action/`, { action, ...payload });
    return res.data;
  },

  getGSTBatchesDetailed: async (): Promise<GSTBatchDetail[]> => {
    const res = await api.get('/accounts/gst/batches/');
    return res.data.results || res.data;
  },

  reviewGSTBatchExceptions: async (batchId: string, comment?: string): Promise<{ status: string }> => {
    const res = await api.post(`/accounts/gst/batches/${batchId}/review-exceptions/`, { comment });
    return res.data;
  },

  escalateGSTBatch: async (batchId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/gst/batches/${batchId}/escalate/`, { comment });
    return res.data;
  },

  getAllEscalations: async (): Promise<EscalationRecord[]> => {
    const res = await api.get('/accounts/escalations/');
    return res.data.results || res.data;
  },

  transitionEscalation: async (
    id: string,
    action: 'investigate' | 'forward_to_controller' | 'resolve',
    comment?: string
  ): Promise<EscalationRecord> => {
    const res = await api.post(`/accounts/escalations/${id}/transition/`, { action, comment });
    return res.data;
  },

  getWeeklyReview: async (week: 'This Week' | 'Last Week' = 'This Week'): Promise<WeeklyReviewData> => {
    const res = await api.get('/accounts/reviews/weekly/', { params: { week } });
    return res.data;
  },

  shareWeeklyReview: async (week: string): Promise<{ status: string; week: string }> => {
    const res = await api.post('/accounts/reviews/weekly/share/', { week });
    return res.data;
  },

  getMonthEndReadiness: async (period: string = '2026-09'): Promise<MonthEndReadinessData> => {
    const res = await api.get(`/accounts/close/monthly/${period}/readiness/`);
    return res.data;
  },

  reassignMonthEndChecklistOwner: async (period: string, code: string, owner: string): Promise<any> => {
    const res = await api.patch(`/accounts/close/monthly/${period}/checklist/${code}/owner/`, { owner });
    return res.data;
  },

  escalateMonthEndDelays: async (period: string = '2026-09'): Promise<{ status: string; count: number }> => {
    const res = await api.post(`/accounts/close/monthly/${period}/escalate-delays/`);
    return res.data;
  },

  getSupervisorPerformance: async (): Promise<SupervisorPerformance[]> => {
    const res = await api.get('/accounts/team/performance/', { params: { level: 'supervisor' } });
    return res.data;
  },

  getExecutivePerformance: async (): Promise<ExecutivePerformance[]> => {
    const res = await api.get('/accounts/team/performance/', { params: { level: 'executive' } });
    return res.data;
  },

  getDepartmentPerformance: async (): Promise<DepartmentPerformance> => {
    const res = await api.get('/accounts/analytics/departments/');
    return res.data;
  },

  getRecentAudit: async (days: number = 31): Promise<AuditRecord[]> => {
    const res = await api.get('/accounts/audit/recent/', { params: { days } });
    return res.data;
  },

  // === Phase 5: Finance Controller APIs (paths match apps/accounting/urls.py) ===
  getControllerDashboard: async (): Promise<ControllerDashboardData> => {
    const res = await api.get('/accounts/controller/dashboard/');
    return res.data;
  },

  getMonthEndClose: async (period: string): Promise<MonthEndCloseData> => {
    const res = await api.get(`/accounts/close/monthly/${period}/`);
    return res.data;
  },

  approveMonthEndClose: async (period: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/monthly/${period}/approve/`);
    return res.data;
  },

  delayMonthEndClose: async (period: string, newDate: string, reason: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/monthly/${period}/delay/`, { new_date: newDate, reason, comment: reason });
    return res.data;
  },

  escalateMonthEndClose: async (period: string, reason: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/monthly/${period}/escalate/`, { reason, comment: reason });
    return res.data;
  },

  getQuarterEndClose: async (quarter: string): Promise<QuarterEndCloseData> => {
    const res = await api.get(`/accounts/close/quarterly/${quarter}/`);
    return res.data;
  },

  reviewQuarterEndItem: async (quarter: string, itemId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/quarterly/${quarter}/items/${itemId}/review/`);
    return res.data;
  },

  approveQuarterEndClose: async (quarter: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/quarterly/${quarter}/approve/`);
    return res.data;
  },

  lockQuarterEndClose: async (quarter: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/quarterly/${quarter}/lock/`);
    return res.data;
  },

  getYearEndClose: async (fiscalYear: string): Promise<YearEndCloseData> => {
    const res = await api.get(`/accounts/close/yearly/${fiscalYear}/`);
    return res.data;
  },

  actYearEndItem: async (fiscalYear: string, itemId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/close/yearly/${fiscalYear}/observations/${itemId}/act/`);
    return res.data;
  },

  lockControllerPeriod: async (periodId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/periods/${periodId}/lock/`);
    return res.data;
  },

  reopenControllerPeriod: async (periodId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/periods/${periodId}/reopen/`, { comment, ack: true });
    return res.data;
  },

  getPaymentBatches: async (): Promise<PaymentBatchItem[]> => {
    const res = await api.get('/accounts/payment-batches/');
    return listOf(res.data);
  },

  releasePaymentBatch: async (batchId: string, acknowledged: boolean): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/payment-batches/${batchId}/release/`, { ack: acknowledged });
    return res.data;
  },

  holdPaymentBatch: async (batchId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/payment-batches/${batchId}/hold/`, { comment });
    return res.data;
  },

  returnPaymentBatch: async (batchId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/payment-batches/${batchId}/return/`, { comment });
    return res.data;
  },

  cosignPaymentBatch: async (batchId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/payment-batches/${batchId}/cosign/`, { comment });
    return res.data;
  },

  getBankAccounts: async (): Promise<BankAccountControlItem[]> => {
    const res = await api.get('/accounts/bank-accounts/');
    return listOf(res.data);
  },

  /** Toggles: freezes an active account, unfreezes a frozen one. */
  freezeBankAccount: async (bankAccountId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/bank-accounts/${bankAccountId}/freeze/`, { comment });
    return res.data;
  },

  getBankReconciliations: async (): Promise<BankReconciliationItem[]> => {
    const res = await api.get('/accounts/reconciliations/');
    return listOf(res.data);
  },

  approveBankReconciliation: async (reconId: string, acknowledged: boolean): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/reconciliations/${reconId}/approve/`, { ack: acknowledged });
    return res.data;
  },

  returnBankReconciliation: async (reconId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/reconciliations/${reconId}/return/`, { comment });
    return res.data;
  },

  getFinancialStatement: async (statementType: 'pl' | 'bs' | 'cf', period: string): Promise<FinancialStatementData> => {
    const res = await api.get(`/accounts/statements/${statementType}/`, { params: { period } });
    return res.data;
  },

  flagStatementVariance: async (statementType: string, lineKey: string, query: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/statements/${statementType}/flags/`, { line_key: lineKey, query });
    return res.data;
  },

  approveFinancialStatement: async (statementType: string, acknowledged: boolean): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/statements/${statementType}/approve/`, { ack: acknowledged });
    return res.data;
  },

  getTaxReturns: async (): Promise<TaxReturnItem[]> => {
    const res = await api.get('/accounts/tax/returns/');
    return listOf(res.data);
  },

  approveTaxReturn: async (returnId: string, acknowledged: boolean): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/tax/returns/${returnId}/approve/`, { ack: acknowledged });
    return res.data;
  },

  returnTaxReturn: async (returnId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/tax/returns/${returnId}/return/`, { comment });
    return res.data;
  },

  escalateTaxReturn: async (returnId: string, comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/tax/returns/${returnId}/escalate/`, { comment });
    return res.data;
  },

  getAuditRequests: async (): Promise<AuditRequestItem[]> => {
    const res = await api.get('/accounts/audit/requests/');
    return listOf(res.data);
  },

  markAuditRequestReady: async (requestId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/audit/requests/${requestId}/ready/`);
    return res.data;
  },

  shareAuditRequest: async (requestId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/audit/requests/${requestId}/share/`);
    return res.data;
  },

  requestAuditEvidence: async (requestId: string, owner: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/audit/requests/${requestId}/request-evidence/`, { owner });
    return res.data;
  },

  getAuditObservations: async (): Promise<AuditObservationItem[]> => {
    const res = await api.get('/accounts/audit/observations/');
    return listOf(res.data);
  },

  actAuditObservation: async (obsId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/audit/observations/${obsId}/act/`);
    return res.data;
  },

  getControlViolations: async (): Promise<ControlViolationItem[]> => {
    const res = await api.get('/accounts/controls/violations/');
    return listOf(res.data);
  },

  actControlViolation: async (violationId: string, action: 'remediate' | 'escalate' | 'close', owner?: string, comment?: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/controls/violations/${violationId}/action/`, { action, owner, comment });
    return res.data;
  },

  getHighRiskItems: async (): Promise<HighRiskReviewItem[]> => {
    const res = await api.get('/accounts/high-risk/');
    return listOf(res.data);
  },

  decideHighRiskItem: async (itemId: string, decision: 'approve' | 'return' | 'reject' | 'forward_to_cfo', comment: string, acknowledged: boolean): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/high-risk/${itemId}/decision/`, { decision, comment, ack: acknowledged });
    return res.data;
  },

  /** Controller actions on the shared exception register: assign · accept (risk) · cfo (escalate) · close. */
  actControllerException: async (exceptionId: string, action: 'assign' | 'accept' | 'cfo' | 'close', owner?: string, comment?: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/exceptions/${exceptionId}/action/`, { action, owner, comment });
    return res.data;
  },

  getFinancialPolicies: async (): Promise<PolicyMasterItem[]> => {
    const res = await api.get('/accounts/policies/');
    return listOf(res.data);
  },

  /** The server resolves the pending change from the policy itself; the change id in the path is not used. */
  decidePolicyChange: async (policyId: string, decision: 'approve' | 'reject', comment: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/policies/${policyId}/changes/current/decision/`, { decision, comment });
    return res.data;
  },

  reviewPolicy: async (policyId: string): Promise<{ status: string; message: string }> => {
    const res = await api.post(`/accounts/policies/${policyId}/review/`);
    return res.data;
  },

  // === Phase 6: Chief Financial Officer (CFO) Strategy APIs ===
  getCfoDashboard: async (): Promise<CfoDashboardData> => {
    const res = await api.get('/accounts/cfo/dashboard/');
    return res.data;
  },

  getCfoProfitLoss: async (period: string = 'Month'): Promise<CfoProfitLossData> => {
    const res = await api.get('/accounts/cfo/pl/', { params: { period } });
    return res.data;
  },

  getCfoCashFlow: async (view: string = '30 Days', buffer_cr: number = 5.0): Promise<CfoCashFlowData> => {
    const res = await api.get('/accounts/cfo/cash-flow/', { params: { view, buffer_cr } });
    return res.data;
  },

  getCfoBalanceSheet: async (): Promise<CfoBalanceSheetData> => {
    const res = await api.get('/accounts/cfo/balance-sheet/');
    return res.data;
  },

  getCfoDeptProfitability: async (rank: string = 'Most Profitable'): Promise<CfoDeptProfitabilityData> => {
    const res = await api.get('/accounts/cfo/departments/profitability/', { params: { rank } });
    return res.data;
  },

  requestCfoTurnaroundPlan: async (dept: string, message: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/departments/${dept}/turnaround/`, { message });
    return res.data;
  },

  getCfoServiceLines: async (sort: string = 'Growth'): Promise<CfoServiceLinesData> => {
    const res = await api.get('/accounts/cfo/services/', { params: { sort } });
    return res.data;
  },

  getCfoBudgetStrategy: async (view: string = 'Department'): Promise<CfoBudgetStrategyData> => {
    const res = await api.get('/accounts/cfo/budgets/strategy/', { params: { view } });
    return res.data;
  },

  decideCfoBudgetStrategy: async (decision: string, comment?: string): Promise<any> => {
    const res = await api.post('/accounts/cfo/budgets/strategy/decide/', { decision, comment });
    return res.data;
  },

  getCfoForecast: async (horizon: string = '12 Months', scenario: string = 'Expected', buffer_cr: number = 5.0): Promise<CfoForecastData> => {
    const res = await api.get('/accounts/cfo/forecast/', { params: { horizon, scenario, buffer_cr } });
    return res.data;
  },

  getCfoCapexRequests: async (status: string = 'Awaiting'): Promise<any> => {
    const res = await api.get('/accounts/cfo/capex/', { params: { status } });
    return res.data;
  },

  decideCfoCapex: async (capexId: string, action: string, comment?: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/capex/${capexId}/decide/`, { action, comment });
    return res.data;
  },

  getCfoStrategicApprovals: async (status: string = 'Awaiting'): Promise<any> => {
    const res = await api.get('/accounts/cfo/approvals/', { params: { status } });
    return res.data;
  },

  decideCfoStrategicApproval: async (approvalId: string, action: string, comment?: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/approvals/${approvalId}/decide/`, { action, comment });
    return res.data;
  },

  getCfoGrowthOpportunities: async (stage: string = 'All'): Promise<any> => {
    const res = await api.get('/accounts/cfo/growth/', { params: { stage } });
    return res.data;
  },

  decideCfoGrowthOpportunity: async (oppId: string, action: string, comment?: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/growth/${oppId}/decide/`, { action, comment });
    return res.data;
  },

  getCfoStrategicRisks: async (level: string = 'All'): Promise<any> => {
    const res = await api.get('/accounts/cfo/risks/', { params: { level } });
    return res.data;
  },

  decideCfoStrategicRisk: async (riskId: string, action: string, comment?: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/risks/${riskId}/decide/`, { action, comment });
    return res.data;
  },

  getCfoExecutiveAlerts: async (status: string = 'Open', buffer_cr: number = 5.0): Promise<any> => {
    const res = await api.get('/accounts/cfo/alerts/', { params: { status, buffer_cr } });
    return res.data;
  },

  actCfoExecutiveAlert: async (alertId: string, action: string, owner?: string, note?: string): Promise<any> => {
    const res = await api.post(`/accounts/cfo/alerts/${alertId}/action/`, { action, owner, note });
    return res.data;
  },

  getCfoBoardReport: async (): Promise<BoardReportData> => {
    const res = await api.get('/accounts/cfo/board-report/');
    return res.data;
  },

  approveCfoBoardReport: async (comment?: string): Promise<any> => {
    const res = await api.post('/accounts/cfo/board-report/approve/', { comment });
    return res.data;
  },

  exportCfoBoardReport: async (exportType: string = 'pdf'): Promise<any> => {
    const res = await api.post('/accounts/cfo/board-report/export/', { type: exportType });
    return res.data;
  },

  toggleCfoBoardSection: async (section: string, included: boolean): Promise<any> => {
    const res = await api.post('/accounts/cfo/board-report/section/toggle/', { section, included });
    return res.data;
  },

  getCfoExecutiveDecisions: async (category: string = 'All'): Promise<any> => {
    const res = await api.get('/accounts/cfo/decisions/', { params: { category } });
    return res.data;
  },

  // === Phase 11: Auditor (read-only, time-boxed) ===
  getAuditorMe: async (): Promise<AuditorMe> => {
    const res = await api.get('/accounts/auditor/me/');
    return res.data;
  },

  getAuditorPBC: async (): Promise<AuditorPBCItem[]> => {
    const res = await api.get('/accounts/auditor/pbc/');
    return res.data;
  },

  getAuditorPBCEvidence: async (requestNo: string): Promise<AuditorPBCEvidence> => {
    const res = await api.get(`/accounts/auditor/pbc/${encodeURIComponent(requestNo)}/evidence/`);
    return res.data;
  },

  getAuditorControls: async (): Promise<AuditorControls> => {
    const res = await api.get('/accounts/auditor/controls/');
    return res.data;
  },

  getAuditorLogs: async (params: Partial<Record<'module' | 'action' | 'user' | 'from' | 'to' | 'q', string>> = {}): Promise<{ count: number; logs: AuditorLogEntry[] }> => {
    const res = await api.get('/accounts/auditor/logs/', { params });
    return res.data;
  },

  getAuditorIntegrity: async (): Promise<AuditorIntegrity> => {
    const res = await api.get('/accounts/auditor/integrity/');
    return res.data;
  },

  getAuditorLedger: async (params: { period?: string; account?: string } = {}): Promise<{ count: number; entries: AuditorLedgerEntry[] }> => {
    const res = await api.get('/accounts/auditor/ledger/', { params });
    return res.data;
  },

  getAuditorTrace: async (journalRef: string): Promise<JournalTrace> => {
    const res = await api.get(`/accounts/auditor/trace/${encodeURIComponent(journalRef)}/`);
    return res.data;
  },
};


// === Phase 4 Types (shapes returned by apps/accounting Phase 4 services) ===
export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray';
export type TrailEntry = { t: string; who: string; when: string; c?: string };

export interface ManagerDashboardData {
  kpis: Array<{ code: string; label: string; value: string; trend: string; tone: Tone; link_screen: string }>;
  alerts: Array<{ severity: 'critical' | 'warning' | 'info'; tag: string; title: string; desc: string; screen: string }>;
  high_priority: Array<{ type: string; ref: string; title: string; dept: string; amt: number; screen: string; item_id?: string }>;
  escalated_cases: Array<{ id: string; reason: string; ref: string; type: string; title: string; sup: string; amt: number; age: string }>;
  trends: {
    weeks: string[];
    ar: number[];
    ap: number[];
    cash_inflow: number[];
    cash_outflow: number[];
    dept_spend_months: string[];
    dept_spend: number[];
  };
}

export interface SummaryGroup {
  label: string;
  n: string;
  amt: number;
  share: string;
  c4: string;
  c4_color: string;
}

export interface PayerItem {
  id: string;
  payer: string;
  src: string;
  dept: string;
  amt: number;
  count: number;
  oldest: number;
  pct: [number, number, number, number];
  due: number;
  rec: number;
  prio: 'High' | 'Medium' | 'Low';
  owner: string;
  promise: string;
  late: number;
  note: string;
  esc: boolean;
  wo: { id?: string; amt: number; reason: string; status: string } | null;
}

export interface PayableBill {
  id: string;
  vendor: string;
  ref: string;
  dept: string;
  cat: string;
  amt: number;
  dueIn: number;
  status: string;
  prio: string;
  msme: boolean;
  issue: string;
  risk: string;
  match: string;
  approvedBy: string;
  trail: TrailEntry[];
}

export interface CashflowProjection {
  days: number;
  starting_cash: number;
  buffer: number;
  expected_collections: number;
  expected_payments: number;
  projected_closing: number;
  lowest_balance: number;
  lowest_date: string;
  is_breach: boolean;
  series: Array<{ day: number; label: string; inflow: number; outflow: number; balance: number; events: Array<{ t: string; amt: number }> }>;
  large_payments: Array<{ date: string; title: string; amount: number; balance_after: number; breach: boolean }>;
  delayed_receivables: Array<{ payer: string; promise: string; late: string; amount: number }>;
  warnings: Array<{ severity: 'critical' | 'warning' | 'success'; title: string; desc: string }>;
}

export interface HighValueTransaction {
  id: string;
  ref: string;
  kind: 'Vendor Bill' | 'Refund' | 'Expense Request' | 'Adjustment';
  title: string;
  dept: string;
  amt: number;
  risk: 'High' | 'Medium' | 'Low';
  status: string;
  date: string;
  by: string;
  kv: Array<[string, string]>;
  trail?: TrailEntry[];
}

export interface DepartmentBudget {
  id: string;
  dept: string;
  head: string;
  budget: number;
  used: number;
  committed: number;
  available: number;
  utilization_pct: number;
  status: 'Over Budget' | 'Near Limit' | 'Within Budget';
  expl: string;
  esc: boolean;
  trail: TrailEntry[];
}

export interface CostCenterAnalysis {
  period: string;
  label: string;
  total_spend: number;
  total_budget: number;
  variance: number;
  variance_pct: number;
  over_budget_count: number;
  top_cost_centers: Array<{ code: string; name: string; actual: number; budget: number; variance: number; variance_pct: number }>;
  mix: Array<{ l: string; c: string; w: string; amt: number }>;
  trend: Array<[string, number]>;
}

export interface FinancialExceptionItem {
  id: string;
  db_id: string;
  type: string;
  ref: string;
  title: string;
  dept: string;
  amt: number;
  owner: string;
  status: 'New' | 'Assigned' | 'Investigating' | 'Escalated' | 'Closed';
  raised: string;
  age: number;
  src: string;
  trail: TrailEntry[];
}

export interface GSTBatchDetail {
  id: string;
  reference_no: string;
  direction: string;
  period_from: string;
  period_to: string;
  invoice_count: number;
  tax_value: string;
  exception_count: number;
  status: string;
  prepared_by_name: string;
  reviewed_by_name: string;
  reviewed_by_manager: boolean;
  turnaround_days: string;
  exceptions: Array<{ id: string; type: string; amount: string; status: string }>;
}

export interface EscalationRecord {
  id: string;
  reference_no: string;
  type: string;
  reason: string;
  entity_type: string;
  entity_id: string;
  raised_by_full_name: string;
  raised_to: string;
  amount: string;
  status: string;
  resolution: string;
  notes: Array<{ who?: string; author?: string; when?: string; timestamp?: string; t?: string; text?: string }>;
  created_at: string;
}

export interface WeeklyReviewData {
  week: string;
  range: string;
  collections: number;
  payments: number;
  receivables: number;
  payables: number;
  total_spend: number;
  previous: { collections: number; payments: number; receivables: number; payables: number; total_spend: number };
  dept_spending: Array<{ dept: string; amount: number; prev_amount: number; pct_change: number; is_over: boolean }>;
  summary_lines: string[];
  risks: Array<{ tag: 'Critical' | 'Warning' | 'Info'; t: string }>;
}

export interface MonthEndChecklistItem {
  id: string;
  code: string;
  title: string;
  owner: string;
  pct: number;
  due: string;
  status: 'On Track' | 'Delayed' | 'Done';
  desc: string;
  screen: string;
  escalated: boolean;
}

export interface MonthEndReadinessData {
  period: string;
  readiness_score: number;
  target_date: string;
  controller_close_date: string;
  delayed_count: number;
  completed_count: number;
  checklist: MonthEndChecklistItem[];
}

export interface SupervisorPerformance {
  name: string;
  code: string;
  approved: number;
  returns: number;
  escalations: number;
  pending: number;
  resolution_hours: number | null;
}

export interface ExecutivePerformance {
  name: string;
  code: string;
  processed: number;
  pending: number;
  approved: number;
  returned: number;
  errors: number;
  first_pass: string;
  productivity: string;
}

export interface DepartmentPerformance {
  period: string;
  total_revenue: number;
  total_expense: number;
  total_profit: number;
  profitability_pct: number;
  growth_pct: number;
  departments: Array<{ dept: string; revenue: number; expense: number; profit: number; margin_pct: number; growth_pct: number; ar: number }>;
}

export interface AuditRecord {
  id: string;
  actor_name: string;
  actor_role: string;
  module: string;
  action: string;
  reference_no: string;
  reason: string;
  occurred_at: string;
}

// === Phase 5: Finance Controller Types (shapes built by FinanceControllerService) ===
export interface ControllerDashboardData {
  controller_name: string;
  kpis: Array<{ code: string; label: string; value: string; trend: string; tone: string; link_screen: string }>;
  integrity_questions: Array<{ q: string; v: string; tone: 'g' | 'a' | 'r' | 'b'; desc: string; screen: string }>;
  readiness_pct: number;
  closing_status: string;
  target_close_date: string;
  checklist: CloseChecklistItem[];
  risks: Array<{ sev: string; title: string; desc: string; screen: string }>;
  pending_actions: Array<{ type: string; ref: string; title: string; module: string; amount: number; item_id: string; screen: string }>;
}

export interface CloseChecklistItem {
  id: string;
  t: string;
  d: string;
  pct: number;
  owner: string;
  go: string | null;
  st: string;
}

export interface MonthEndCloseData {
  period: string;
  readiness_pct: number;
  status: string;
  target_date: string;
  checklist: CloseChecklistItem[];
  blockers: string[];
  timeline: Array<{ t: string; when: string; state: 'd' | 'c' | 'f' }>;
}

export interface QuarterEndCloseData {
  quarter: string;
  label: string;
  months_locked: string;
  items_reviewed: string;
  bad_debt_provision: string;
  status: string;
  items: Array<{ id: string; title: string; desc: string; owner: string; status: string }>;
}

export interface YearEndCloseData {
  fiscal_year: string;
  items: AuditObservationItem[];
}

export interface AuditObservationItem {
  id: string;
  title: string;
  desc?: string;
  description?: string;
  owner: string;
  status: string;
  kind: string;
}

export interface BatchCheckItem {
  t: string;
  ok: boolean;
  sev?: string;
  ctl?: string;
  hard?: boolean;
}

export interface PaymentBatchItem {
  id: string;
  db_id: string;
  name: string;
  batch_type: string;
  total_amount: number;
  item_count: number;
  source_bank_code: string;
  value_date_label: string;
  status: string;
  prepared_by: string;
  approved_by: string;
  checks: BatchCheckItem[];
  ack_text: string;
  items_summary: string[] | string;
  trail: TrailEntry[];
}

export interface BankAccountControlItem {
  id: string;
  bank_name: string;
  account_no_masked: string;
  purpose: string;
  book_balance: number;
  statement_balance: number;
  frozen: boolean;
  frozen_reason: string;
}

export interface BankReconciliationItem {
  id: string;
  db_id: string;
  bank_name: string;
  account_no_masked: string;
  purpose: string;
  book_balance: number;
  statement_balance: number;
  difference: number;
  status: string;
  prepared_by: string;
  last_reconciled: string;
  exception_ref: string;
  ack_text: string;
  trail: TrailEntry[];
}

export interface StatementLineItem {
  id: string;
  line_key: string;
  label: string;
  line_type: string;
  current_amount: number;
  comparison_amount: number;
  variance_pct: number;
  flag_exception_no: string | null;
}

export interface FinancialStatementData {
  statement_type: string;
  name: string;
  sub_title: string;
  period: string;
  is_approved: boolean;
  tie_outs: unknown[];
  lines: StatementLineItem[];
}

export interface TaxReturnItem {
  id: string;
  db_id: string;
  form: string;
  period: string;
  due_date: string;
  tax_amount: number;
  status: string;
  exceptions: string[];
  link_exception: string;
  prepared_by: string;
  invoice_count: number;
  ack_text: string;
  trail: TrailEntry[];
}

export interface AuditRequestItem {
  id: string;
  db_id: string;
  title: string;
  owner: string;
  due_date: string;
  status: string;
  evidence_files: string[];
  note: string;
  trail: TrailEntry[];
}

export interface ControlViolationItem {
  id: string;
  db_id: string;
  control_name: string;
  severity: string;
  title: string;
  who: string;
  refs: string;
  exposure_amount: number;
  detected_date: string;
  status: string;
  owner: string;
  trail: TrailEntry[];
}

export interface HighRiskReviewItem {
  id: string;
  db_id: string;
  ref: string;
  kind: string;
  title: string;
  dept: string;
  amount: number;
  risk: string;
  why: string;
  recv_date: string;
  key_values: Array<[string, string]>;
  documents: string[];
  ack_text: string;
  status: string;
  trail: TrailEntry[];
}

export interface PolicyMasterItem {
  id: string;
  db_id: string;
  name: string;
  version: string;
  owner: string;
  next_review: string;
  status: string;
  change_data: { what?: string; by?: string; why?: string } | null;
  key_values: Array<[string, string]>;
  trail: TrailEntry[];
}

// === Phase 6: Chief Financial Officer (CFO) Strategy Types ===
export interface CfoDashboardData {
  kpis: {
    total_revenue: string;
    revenue_growth: string;
    total_expense: string;
    net_profit: string;
    net_profit_margin: string;
    cash_available: string;
    runway_all: string;
    ebitda: string;
    ebitda_margin: string;
    budget_variance: string;
    patient_revenue_growth: string;
    on_track: boolean;
  };
  badges: {
    capex: number;
    approvals: number;
    alerts: number;
    risks: number;
    budget: number;
    board: number;
  };
  questions: Array<{
    q: string;
    v: string;
    d: string;
    target: string;
  }>;
  upcoming_decisions: Array<{
    k: string;
    id: string;
    t: string;
    v: string;
    due: string;
    target: string;
  }>;
  revenue_trend: Array<{
    month: string;
    revenue: number;
    expense: number;
  }>;
  department_rankings: Array<{
    name: string;
    revenue: number;
    expense: number;
    profit: number;
    margin: number;
  }>;
}

export interface CfoProfitLossData {
  period: string;
  labels: string[];
  kpis: {
    revenue: string;
    revenue_change: string;
    ebitda: string;
    ebitda_margin: string;
    payroll: string;
    payroll_pct: string;
    net_profit: string;
    net_profit_margin: string;
  };
  lines: Array<{
    label: string;
    current: number;
    comparison: number;
    change_pct: number;
    pct_of_rev: number;
    is_bold: boolean;
    is_cost: boolean;
    is_header?: boolean;
  }>;
  trend: Array<{
    month: string;
    actual: number;
    budget: number | null;
  }>;
}

export interface CfoCashFlowData {
  view: string;
  cash_balance: string;
  expected_inflows: string;
  expected_outflows: string;
  closing_balance: string;
  lowest_balance: string;
  lowest_date: string;
  is_below_buffer: boolean;
  runway_cash: string;
  runway_all: string;
  points: Array<{
    lbl: string;
    inn: number;
    out: number;
    bal: number;
    ev?: Array<{ t: string; a: number; k: string }>;
  }>;
  warnings: Array<{
    level: string;
    title: string;
    detail: string;
  }>;
  major_payments: Array<{
    date: string;
    t: string;
    a: number;
    k: string;
    bal: number;
  }>;
}

export interface CfoBalanceSheetData {
  total_assets: string;
  total_liabilities: string;
  equity: string;
  debt_to_equity: string;
  has_new_loans: boolean;
  assets: Array<{
    name: string;
    amount: number;
    share: string;
    color: string;
  }>;
  liabilities: Array<{
    name: string;
    amount: number;
    share: string;
  }>;
  debt_capacity: Array<{
    measure: string;
    today: string;
    pro_forma: string;
    limit: string;
  }>;
}

export interface CfoDeptProfitabilityData {
  rank: string;
  total_revenue: string;
  total_expense: string;
  overhead: string;
  net_contribution: string;
  margin_pct: string;
  loss_making_count: number;
  departments: Array<{
    name: string;
    revenue: number;
    expense: number;
    profit: number;
    margin: number;
    prev_margin: number;
    margin_diff: number;
    driver: string;
    status: string;
  }>;
  directives: Record<string, string>;
}

export interface CfoServiceLinesData {
  sort_by: string;
  total_revenue: string;
  weighted_growth: string;
  fastest_growing: string;
  fastest_growth_pct: string;
  highest_margin: string;
  highest_margin_pct: string;
  service_lines: Array<{
    id: string;
    service_line: string;
    department_id: string;
    revenue: number;
    volume: number;
    unit: string;
    margin_pct: number;
    yoy_growth_pct: number;
    trend: string;
  }>;
}

export interface CfoBudgetStrategyData {
  view: string;
  status: string;
  proposal: {
    fiscal_year: string;
    revenue_target: string;
    ebitda_target: string;
    net_profit_target: string;
    capex_budget: string;
    trail: TrailEntry[];
  };
  dept_rows: Array<[string, number, number, number, number]>;
  hospital_rows: Array<[string, number, number, number]>;
  growth_rows: Array<[string, number, number, number, string]>;
}

export interface CfoForecastData {
  horizon: string;
  scenario: string;
  kpis: {
    forecast_revenue: string;
    forecast_expense: string;
    forecast_profit: string;
    profit_margin: string;
    closing_cash: string;
    lowest_cash: string;
    is_low_below_buffer: boolean;
  };
  has_fresh_capex: boolean;
  points: Array<{
    lbl: string;
    month_idx: number;
    quarter: number;
    rev: number;
    exp: number;
    np: number;
    bal: number;
  }>;
  scenario_comparison: Record<string, {
    rev: string;
    exp: string;
    np: string;
    closing_cash: string;
    low_cash: string;
  }>;
}

export interface BoardReportData {
  meeting_date: string;
  period: string;
  status: string;
  kpis: {
    meeting: string;
    pack_status: string;
    sections_count: number;
    decisions_for_board: number;
  };
  headlines: string[];
  sections: Array<{
    key: string;
    title: string;
    icon: string;
    included: boolean;
    metrics: Array<{ label: string; value: string }>;
    bullets: string[];
  }>;
  trail: TrailEntry[];
}


// === Phase 11 Types (auditor workspace) ===
export interface AuditorMe {
  auditor: string;
  role: string;
  engagement: {
    engagement_no: string;
    type: string;
    auditor_firm: string;
    period_from: string;
    period_to: string;
    fieldwork_from: string;
    fieldwork_to: string;
  } | null;
  access: { valid_from: string; valid_until: string } | null;
  chain: { status: string; valid: boolean; total_records: number; last_sequence: number };
}

export interface AuditorPBCItem {
  id: string;
  title: string;
  owner: string;
  due_date: string;
  status: string;
  shared_at: string;
  evidence_count: number;
}

export interface AuditorPBCEvidence {
  id: string;
  title: string;
  note: string;
  shared_at: string;
  evidence: Array<{ file_name: string; file_url: string; checksum: string; uploaded_at: string }>;
}

export interface AuditorControls {
  coverage: Array<{
    code: string;
    name: string;
    description: string;
    severity: string;
    frequency: string;
    last_run_at: string;
    last_checked: number;
    last_findings: number;
    open_violations: number;
    covered: boolean;
  }>;
  violations: Array<{
    id: string;
    control_name: string;
    severity: string;
    title: string;
    who: string;
    refs: string;
    exposure_amount: number;
    detected_date: string;
    status: string;
    owner: string;
    trail: Array<{ t: string; who: string; when: string; c?: string }>;
  }>;
}

export interface AuditorLogEntry {
  id: string;
  sequence: number;
  occurred_at: string;
  actor_name: string;
  actor_role: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reference_no: string;
  reason: string;
  entry_hash: string;
  previous_hash: string;
  hash_valid: boolean;
}

export interface AuditorIntegrity {
  chain: {
    status: string;
    valid: boolean;
    total_records: number;
    last_sequence: number;
    head_hash: string;
    error?: string;
    broken_at_sequence?: number;
    days: Array<{ date: string; records: number; valid: boolean }>;
  };
  worm_exports: { valid: boolean; exports: Array<{ export_date: string; status: string; records: number }> };
}

export interface AuditorLedgerEntry {
  posting_date: string;
  period: string;
  journal: string;
  account: string;
  cost_center: string;
  debit: string;
  credit: string;
  department: string;
}

export interface JournalTrace {
  journal: {
    id: string;
    reference_no: string;
    journal_date: string;
    period: string;
    description: string;
    status: string;
    entry_type: string;
    source: string;
    maker: string;
    posted_at: string;
    total_debit: string;
    total_credit: string;
    lines: Array<{ account: string; debit: string; credit: string; cost_center: string; narration: string }>;
  };
  gl_entries: Array<{ account: string; debit: string; credit: string; period: string }>;
  source_events: Array<{ event_id: string; event_type: string; source_department: string; source_reference: string; business_date: string; amount: string; status: string; payload: Record<string, unknown> }>;
  source_documents: Array<{ type: string; reference_no: string; amount: string; invoice_no?: string; vendor?: string; partner?: string }>;
  approvals: Array<{
    reference_no: string;
    document_type: string;
    status: string;
    amount: string;
    maker: string;
    steps: Array<{ step_no: number; level: string; decision: string; actor: string; comment: string; limit_applied: string; decided_at: string }>;
  }>;
  documents: Array<{ file_name: string; doc_type: string; checksum: string; validated: boolean }>;
  audit_trail: AuditorLogEntry[];
  completeness: {
    source_identified: boolean;
    approval_evidence: boolean;
    auto_posted_by_rule: boolean;
    gl_posted: boolean;
    audit_entries_hash_valid: boolean;
    chain_valid: boolean;
  };
}

