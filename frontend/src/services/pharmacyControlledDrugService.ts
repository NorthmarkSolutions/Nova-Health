import api from './api';

export interface ControlledDrugBatch {
  id: string;
  batch_number: string;
  expiry_date: string;
  available_quantity: number;
  storage_location: string;
}

export interface ControlledDrugVaultItem {
  id: string;
  item_code: string;
  name: string;
  generic_name: string;
  schedule: string;
  strength: string;
  category: string;
  unit_of_measure: string;
  unit_price: number;
  is_narcotic: boolean;
  reorder_level: number;
  total_stock: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  vault_safe: string;
  last_verified_count: number;
  last_reconciliation_status: string;
  batches: ControlledDrugBatch[];
}

export interface ControlledDrugRegisterEntry {
  id: string;
  entry_number: string;
  medicine: string;
  medicine_name: string;
  medicine_code: string;
  medicine_strength: string;
  medicine_schedule: string;
  batch: string;
  batch_number: string;
  batch_expiry: string;
  patient: string | null;
  patient_name: string;
  patient_uhid: string;
  prescribing_doctor_name: string;
  doctor_license_number: string;
  rx_number: string | null;
  quantity_dispensed: number;
  balance_stock_after: number;
  primary_pharmacist: string;
  primary_pharmacist_name: string;
  witness_staff: string;
  witness_staff_name: string;
  witness_role: string;
  dispense_order: string | null;
  order_number?: string;
  remarks: string;
  vault_location: string;
  discrepancy_noted: boolean;
  discrepancy_notes: string | null;
  created_at: string;
}

export interface ControlledDrugSummaryMetrics {
  cd_items_tracked: number;
  total_vault_stock: number;
  register_entries_today: number;
  register_entries_total: number;
  open_discrepancies: number;
  low_stock_count: number;
  dual_sign_compliance: number;
}

export interface EligibleWitnessStaff {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  role_label: string;
  badge: string;
}

export interface WitnessVerificationResult {
  valid: boolean;
  witness_name?: string;
  witness_role?: string;
  error?: string;
}

export interface ControlledDrugDispensePayload {
  medicine_id?: string;
  item_code?: string;
  batch_id?: string;
  quantity: number;
  patient_id?: string;
  prescribing_doctor_name: string;
  doctor_license_number: string;
  rx_number?: string;
  witness_id: string;
  witness_pin: string;
  remarks: string;
  vault_location?: string;
  order_id?: string;
}

export interface VaultReconciliationPayload {
  batch_id: string;
  physical_count: number;
  reason?: string;
  discrepancy_reason?: string;
  witness_id?: string;
}

export interface InspectionReportEntry {
  entry_number: string;
  timestamp: string;
  medicine_name: string;
  schedule: string;
  batch_number: string;
  patient_uhid: string;
  patient_name: string;
  prescribing_doctor: string;
  doctor_license: string;
  rx_number: string;
  quantity_dispensed: number;
  balance_stock_after: number;
  primary_pharmacist: string;
  witness_staff: string;
  witness_role: string;
  remarks: string;
  discrepancy_noted: boolean;
}

export interface InspectionReportData {
  hospital_name: string;
  facility_code: string;
  drug_license_number: string;
  ndps_possession_permit: string;
  generated_at: string;
  period_start: string | null;
  period_end: string;
  summary: ControlledDrugSummaryMetrics;
  entries: InspectionReportEntry[];
}

export const pharmacyControlledDrugService = {
  // 1. Get Live Vault Inventory
  getVaultInventory: async (): Promise<ControlledDrugVaultItem[]> => {
    const res = await api.get('/pharmacy/controlled-drug/vault-inventory/');
    return res.data;
  },

  // 2. Get Statutory Register Entries
  getRegisterEntries: async (params?: {
    q?: string;
    schedule?: string;
    pill?: string;
  }): Promise<ControlledDrugRegisterEntry[]> => {
    const res = await api.get('/pharmacy/controlled-drug/register/', { params });
    return res.data;
  },

  // 3. Get 4 KPI Summary Metrics
  getSummaryMetrics: async (): Promise<ControlledDrugSummaryMetrics> => {
    const res = await api.get('/pharmacy/controlled-drug/summary/');
    return res.data;
  },

  // 4. Get Eligible Witnesses
  getEligibleWitnesses: async (): Promise<EligibleWitnessStaff[]> => {
    const res = await api.get('/pharmacy/controlled-drug/eligible-witnesses/');
    return res.data;
  },

  // 5. Verify Secondary Witness Credential / PIN
  verifyWitness: async (witnessId: string, pin: string): Promise<WitnessVerificationResult> => {
    const res = await api.post('/pharmacy/controlled-drug/verify-witness/', {
      witness_id: witnessId,
      pin,
    });
    return res.data;
  },

  // 6. Dispense Schedule X / Controlled Substance
  dispenseNarcotic: async (
    payload: ControlledDrugDispensePayload
  ): Promise<ControlledDrugRegisterEntry> => {
    const res = await api.post('/pharmacy/controlled-drug/dispense/', payload);
    return res.data;
  },

  // 7. Perform Vault Physical Shelf Reconciliation
  reconcileVault: async (payload: VaultReconciliationPayload): Promise<any> => {
    const res = await api.post('/pharmacy/controlled-drug/reconcile/', payload);
    return res.data;
  },

  // 8. Export Official Inspection Report
  exportReport: async (schedule: string = 'all'): Promise<InspectionReportData> => {
    const res = await api.get('/pharmacy/controlled-drug/export-report/', {
      params: { schedule },
    });
    return res.data;
  },
};

export default pharmacyControlledDrugService;
