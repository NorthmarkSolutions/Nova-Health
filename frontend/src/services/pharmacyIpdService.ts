import api from './api';

export interface IPDKPIMetrics {
  open_requests: number;
  wards_count: number;
  pending_issues: number;
  awaiting_stock: number;
  issued_today: number;
  units_issued_today: number;
  emergency_requests: number;
  oldest_stat_wait: number;
  ward_returns_count: number;
}

export interface IPDAllocationBatch {
  batch_number: string;
  expiry_date: string;
  allocated_quantity: number;
}

export interface IPDAlternative {
  code: string;
  name: string;
  reason: string;
  stock: number;
}

export interface IPDSubstitutionAudit {
  id: string;
  original_code: string;
  original_name: string;
  substitute_code: string;
  substitute_name: string;
  prescriber_name: string;
  prescriber_approved: boolean;
  approval_notes?: string;
  reason: string;
  requested_at: string;
  approved_at?: string;
  pharmacist: string;
}

export interface IPDHandoverRecord {
  id?: string;
  handed_over_by: string;
  collected_by: string;
  collection_time: string;
  items_count?: number;
  cd_verified?: boolean;
  cold_chain_verified?: boolean;
  notes?: string;
}

export interface IPDLineItem {
  id: string;
  code: string;
  name: string;
  dose: string;
  prescribed_quantity: number; // Requested Quantity
  allocated_quantity?: number; // Allocated Quantity
  remaining_quantity?: number; // Remaining Quantity
  backordered_quantity?: number; // Backordered Quantity
  dispensed_quantity: number;
  unit_price: number;
  line_total: number;
  is_cd: boolean;
  is_cold_chain: boolean;
  available_stock: number;
  is_picked: boolean;
  allocations: IPDAllocationBatch[];
  alternatives: IPDAlternative[];
  subFrom?: string;
  mar_status?: 'Awaiting Supply' | 'Ready To Administer' | 'Administered';
  substitution_audit?: IPDSubstitutionAudit | null;
}

export interface IPDTracking {
  requested_by: string;
  issued_by: string | null;
  received_by: string | null;
  issued_at: string | null;
  received_at: string | null;
  collected_by_nurse?: string | null;
  collection_time?: string | null;
  handed_over_by_pharmacist?: string | null;
}

export interface IPDMARValidation {
  admission_active: boolean;
  order_active: boolean;
  patient_discharged: boolean;
  discharged_at: string | null;
  cancelled_lines: string[];
}

export interface IPDResultSummary {
  title: string;
  detail: string;
  status: string;
  badge: 'green' | 'sky' | 'amber' | 'red' | 'dark' | 'gray';
}

export interface IPDWardRequest {
  id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string;
  age: number;
  gender: string;
  admission_number: string;
  ward: string;
  bed: string;
  doctor_name: string;
  nurse_name: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE' | 'DISCHARGE';
  created_at_time: string;
  wait_minutes: number;
  step: number;
  status: string;
  pending_status?: 'Reviewing' | 'Allocated' | 'Awaiting Pickup' | 'Issued' | 'Partially Issued' | string;
  current_step_name?: 'Review' | 'Allocate Stock' | 'Issue Medicines' | 'Ward Handover' | 'Complete' | string;
  is_emergency: boolean;
  emergency_reason: string;
  is_cancelled: boolean;
  cancellation_reason: string;
  hold_reason: string;
  allergies: string[];
  allergy_conflict: { item_name: string; allergen: string; note: string } | null;
  allergy_override: string;
  has_cd: boolean;
  has_cold_chain: boolean;
  any_shortage: boolean;
  lines: IPDLineItem[];
  tracking: IPDTracking;
  handover_history?: IPDHandoverRecord[];
  substitution_history?: IPDSubstitutionAudit[];
  mar_validation: IPDMARValidation;
  receipt_data: {
    total_amount: number;
    invoice_number: string;
    batches_used: string[];
    result_summary: IPDResultSummary[];
    handover_nurse: string;
    issued_at: string;
  } | null;
}

export interface IPDWardReturnItem {
  name: string;
  qty: number;
  price: number;
  cd?: boolean;
}

export interface IPDWardReturn {
  id: string;
  return_number?: string;
  patient?: string;
  customer_name?: string;
  adm?: string;
  ward?: string;
  bed?: string;
  ward_name?: string;
  bed_number?: string;
  nurse?: string;
  nurse_name?: string;
  items: IPDWardReturnItem[];
  type?: 'Damaged' | 'Expired' | 'Medication changed' | 'Unused' | 'Discharged' | 'CD' | string;
  classification?: 'Patient Discharged' | 'Medication Stopped' | 'Unused' | 'Expired' | 'Damaged' | string;
  reason: string;
  status: 'Requested' | 'Received' | 'Credited' | 'Quarantined' | 'Destroyed' | string;
  at?: string;
  checks?: Record<string, boolean>;
  disp?: string;
  note?: string;
  notes?: string;
  total_refund_amount?: number;
}

export const pharmacyIpdService = {
  // 1. Get Live 5 KPIs
  getIPDKPIs: async (): Promise<IPDKPIMetrics> => {
    const res = await api.get('/pharmacy/ipd/kpis/');
    return res.data;
  },

  // 2. Get Inpatient Ward Queue
  getIPDQueue: async (params?: { tab?: string; ward?: string; q?: string; pending_status?: string }): Promise<IPDWardRequest[]> => {
    const res = await api.get('/pharmacy/ipd/queue/', { params });
    return res.data;
  },

  // 3. Issue to Ward (Atomic completion)
  issueToWard: async (orderId: string, payload: {
    received_by: string;
    collected_by?: string;
    collection_time?: string;
    handed_over_by?: string;
    cd_remarks?: string;
    is_emergency?: boolean;
    emergency_reason?: string;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/issue/${orderId}/`, payload);
    return res.data;
  },

  // 4. STAT Emergency Release
  emergencyRelease: async (orderId: string, payload: {
    reason: string;
    received_by: string;
    cd_remarks?: string;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/emergency-release/${orderId}/`, payload);
    return res.data;
  },

  // 5. Query Prescriber
  queryPrescriber: async (orderId: string, reason: string): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/query-prescriber/${orderId}/`, { reason });
    return res.data;
  },

  // 6. Cancel Request
  cancelRequest: async (orderId: string, reason: string): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/cancel/${orderId}/`, { reason });
    return res.data;
  },

  // 7. Substitute Medicine
  substituteMedicine: async (orderId: string, itemId: string, substituteCode: string): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/substitute/${orderId}/`, {
      item_id: itemId,
      substitute_code: substituteCode,
    });
    return res.data;
  },

  // 8. Request Prescriber Approval & Record Substitution Audit
  requestPrescriberApproval: async (orderId: string, payload: {
    item_id: string;
    substitute_code: string;
    substitute_name: string;
    prescriber_name: string;
    reason: string;
    approval_notes?: string;
    prescriber_approved?: boolean;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/substitute-approval/${orderId}/`, payload);
    return res.data;
  },

  // 9. Update Line Allocation (Requested, Allocated, Remaining, Backordered)
  updateAllocation: async (orderId: string, payload: {
    item_id: string;
    allocated_quantity: number;
    backordered_quantity: number;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/allocation/${orderId}/`, payload);
    return res.data;
  },

  // 10. Record Ward Handover Tracking
  recordWardHandover: async (orderId: string, payload: {
    collected_by: string;
    collection_time: string;
    handed_over_by: string;
    notes?: string;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/handover-tracking/${orderId}/`, payload);
    return res.data;
  },

  // 11. Update Bedside MAR Status
  updateMARStatus: async (orderId: string, payload: {
    item_id?: string;
    mar_status: 'Awaiting Supply' | 'Ready To Administer' | 'Administered';
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/mar-status/${orderId}/`, payload);
    return res.data;
  },

  // 12. Ward Returns List
  getWardReturns: async (params?: { ward?: string; q?: string; classification?: string }): Promise<any[]> => {
    const res = await api.get('/pharmacy/ipd/returns/', { params });
    return res.data;
  },

  // 13. Process Ward Return with Classification
  processWardReturn: async (returnId: string, payload: {
    action: 'receive' | 'inspect' | 'complete';
    checks?: Record<string, boolean>;
    disposition?: string;
    classification?: string;
  }): Promise<any> => {
    const res = await api.post(`/pharmacy/ipd/returns/${returnId}/process/`, payload);
    return res.data;
  },
};

export default pharmacyIpdService;
