# North Hospital Enterprise HMS — Pharmacy Technical Architecture Document

**Document Version:** 2.0  
**Status:** Approved for Implementation Planning  
**Target Milestone:** Level 3 Department Module — Pharmacy & Formulary Engine  

---

## 1. Technical Architecture Overview

The North Hospital Pharmacy subsystem bridges clinical prescribing (OPD consultations & IPD ward requests), over-the-counter dispensing, stock procurement accounting, returns handling, regulatory narcotic control, and financial settlement.

### 1.1 Architecture Invariant: The "Dispense-Action Rule"

```
CORRECT ORDER OF EXECUTION:
Doctor Consultation
       │
       ▼ (Clinical prescription authored)
  Prescription
       │
       ▼ (Routed to pharmacy order queue)
 Pharmacy Queue
       │
       ▼ (Read-only clinical safety & allergy review)
  Verification
       │
       ▼ (Pharmacist confirms physical picking & handover)
    Dispense
       │
       ▼ (Atomic stock deduction from FEFO batches)
Inventory Update
       │
       ▼ (Committed to invoice, TPA, corporate, credit, or IPD ledger)
 Billing Update
```

> [!CAUTION]
> **STRICT ARCHITECTURAL INVARIANT: Inventory Reduces ONLY On Physical Dispense.**  
> **NEVER DO THIS:**  
> `Doctor Prescribing ───❌───► Inventory Reduced`  
> A doctor writing or modifying a prescription **MUST NEVER** decrement inventory stock levels or mutate financial ledgers. Patients may choose not to fill prescriptions, doctors may alter regimens during rounds, or stock may need to be substituted.  
> **Stock is decremented and billing is posted ONLY when the Pharmacist physically executes `DISPENSE` (OPD), `ISSUE` (IPD), or `OTC_SALE`.** Verification, allergy checks, and batch availability checks are strictly **read-only**.

### 1.2 The Complete Pharmacy Lifecycle & Major Workflows

```
                                PROCURMENT PIPELINE
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│   Inventory Manager     │────►│ Pharmacy Admin Approval │────►│     Purchase Order      │
│ Create Purchase Request │     │   (Approve / Reject)    │     │   (Issued to Supplier)  │
└─────────────────────────┘     └─────────────────────────┘     └───────────┬─────────────┘
                                                                            │
                                                                            ▼
                                                                ┌─────────────────────────┐
                                                                │  Receive Stock / GRN    │
                                                                │ (Batches Created: FEFO) │
                                                                └───────────┬─────────────┘
                                                                            │
                               DISPENSING & PATIENT CARE                    │
    ┌───────────────────────────────────┬───────────────────────────────────┼───────────────────────────────────┐
    │ CLINICAL OPD PRESCRIPTION         │ INPATIENT WARD REQUEST (IPD)      │ OTC WALK-IN SALE                  │
    ▼                                   ▼                                   ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐
│ OPD Pharmacist Queue  │           │ IPD Pharmacist Queue  │           │ Counter OTC Request   │           │ Returns Processing    │
│ (/pharmacy?view=opd)  │           │ (/pharmacy?view=ipd)  │           │ (Non-Rx Formulary)    │           │ (Patient / Ward)      │
└───────────┬───────────┘           └───────────┬───────────┘           └───────────┬───────────┘           └───────────┬───────────┘
            │                                   │                                   │                                   │
            ├─► Allergy Cross-Check             ├─► Ward MAR Review                 ├─► Non-Rx Safety Check             ├─► Seal & Expiry Check
            ├─► FEFO Batch Allocation           ├─► Unit-Dose Picking               ├─► FEFO Batch Deduction            ├─► Restock or Quarantine
            │                                   │                                   │                                   │
            ▼                                   ▼                                   ▼                                   ▼
     [ DISPENSE & BILL ]                 [ ISSUE TO WARD ]                   [ COMPLETE OTC SALE ]               [ PROCESS REFUND ]
            │                                   │                                   │                                   │
            ▼                                   ▼                                   ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐
│ Billing: Invoice Item │           │ Billing: IPD Ledger   │           │ Billing: Cashier POS  │           │ Billing: Credit Note  │
│ Stock: Decremented    │           │ Stock: Decremented    │           │ Stock: Decremented    │           │ Stock: Re-incremented │
│ Patient Dossier Sync  │           │ MAR Status: Supplied  │           │ POS Receipt Issued    │           │ Return Audit Logged   │
└───────────────────────┘           └───────────────────────┘           └───────────────────────┘           └───────────────────────┘
                                                ▲
                                                │
                                    ┌───────────────────────┐
                                    │ CONTROLLED DRUGS      │
                                    │ Narcotics / Sched X   │
                                    │ Dual Sign-Off Witness │
                                    │ Register Logged       │
                                    └───────────────────────┘
```

---

## 2. Database Schema Plan (10 Core Entities)

### 2.1 Entity Relationship Model

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│pharmacy_supplier├───────┤ pharmacy_pr_item│*     1│  pharmacy_pr    │
│  (Vendors)      │1     *│ (PR Line Items) ├───────┤ (Purchase Reqs) │
└────────┬────────┘       └─────────────────┘       └────────┬────────┘
         │1                                                  │1
         │*                                                  │1
┌────────┴────────┐       ┌─────────────────┐       ┌────────┴────────┐
│  pharmacy_po    │1     *│ pharmacy_po_item│       │  pharmacy_admin │
│(Purchase Orders)├───────┤ (PO Line Items) │       │    (Approval)   │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │1 (Receipt)
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│pharmacy_medicine│1     *│ pharmacy_batch  │1     *│pharmacy_stock_tx│
│ (Formulary SKU) ├───────┤(Stock by Expiry)├───────┤ (Audit Ledger)  │
└────────┬────────┘       └────────┬────────┘       └─────────────────┘
         │1                        │1
         │*                        │*
┌────────┴────────┐       ┌────────┴────────┐       ┌─────────────────┐
│pharmacy_disp_item       │pharmacy_disp_ord│1     1│controlled_drug_ │
│(Dispensed SKU)  │       │ (Fulfillment)   ├───────┤    register     │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │1
                                   │*
                          ┌────────┴────────┐       ┌─────────────────┐
                          │ pharmacy_return │1     *│pharmacy_otc_sale│
                          │ (Return & Credit│       │  (Walk-in POS)  │
                          └─────────────────┘       └─────────────────┘
```

---

### 2.2 Table Specifications

#### 1. `pharmacy_medicines` (Formulary Master)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Global unique ID |
| `item_code` | VARCHAR(50) | Unique, Indexed | E.g. `MED-PAR-500`, `MED-MOR-010` |
| `name` | VARCHAR(200) | Indexed | Brand / Trade Name (e.g. "Crocin 500mg") |
| `generic_name` | VARCHAR(200) | Indexed | Active molecule (e.g. "Paracetamol") |
| `category` | VARCHAR(50) | Indexed | `TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `IV_FLUID`, `OINTMENT`, `INHALER` |
| `therapeutic_class` | VARCHAR(100) | Indexed | E.g. `Analgesic`, `Antibiotic`, `Opioid Analgesic` |
| `strength` | VARCHAR(50) | Nullable | E.g. "500 mg", "10 mg / mL" |
| `unit_of_measure` | VARCHAR(20) | Default: `'TABLET'` | `TAB`, `CAP`, `VIAL`, `AMP`, `BOTTLE`, `TUBE` |
| `unit_price` | DECIMAL(10,2) | Not Null | Retail selling price per unit |
| `cost_price` | DECIMAL(10,2) | Not Null | Standard supplier procurement price |
| `reorder_level` | INTEGER | Default: 50 | Low-stock threshold for PR generation |
| `reorder_quantity`| INTEGER | Default: 200 | Optimal procurement package size |
| `requires_prescription` | BOOLEAN | Default: True | False for OTC walk-in sale items |
| `is_high_risk` | BOOLEAN | Default: False | High-alert / look-alike sound-alike (LASA) |
| `is_narcotic` | BOOLEAN | Default: False | Schedule X / Controlled drug flag |
| `known_allergens` | JSONB | Default: `[]` | Molecule allergen triggers (e.g. `["PENICILLIN"]`) |
| `is_active` | BOOLEAN | Default: True | Active formulary listing |
| `created_at` | TIMESTAMPTZ | Auto now add | Timestamp |
| `updated_at` | TIMESTAMPTZ | Auto now | Timestamp |

#### 2. `pharmacy_suppliers` (Vendor & Supplier Master)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Vendor unique ID |
| `supplier_code` | VARCHAR(50) | Unique, Indexed | E.g. `SUP-PFIZER-01`, `SUP-MEDLINE-02` |
| `name` | VARCHAR(200) | Indexed | Supplier / Distributor company name |
| `contact_person` | VARCHAR(150) | Nullable | Primary sales representative |
| `phone` | VARCHAR(50) | Not Null | Official phone number |
| `email` | VARCHAR(100) | Indexed | Purchase order dispatch email |
| `drug_license_number`| VARCHAR(100)| Not Null | Regulatory wholesale license ID |
| `tax_number` | VARCHAR(100) | Nullable | GSTIN / Corporate tax identifier |
| `payment_terms_days` | INTEGER | Default: 30 | Net-30, Net-60 payment window |
| `address` | TEXT | Nullable | Physical warehouse address |
| `is_active` | BOOLEAN | Default: True | Active approved vendor status |

#### 3. `pharmacy_purchase_requests` (Internal Reorder Requisition)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | PR ID |
| `pr_number` | VARCHAR(50) | Unique, Indexed | E.g. `PR-202610-0001` |
| `requested_by_id` | UUID | FK -> `users` | Inventory Manager user |
| `priority` | VARCHAR(20) | Default: `'ROUTINE'` | `ROUTINE`, `URGENT`, `EMERGENCY_STAT` |
| `status` | VARCHAR(30) | Indexed | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CONVERTED_TO_PO` |
| `total_estimated_cost` | DECIMAL(12,2)| Default: 0.00 | Sum of requested line items |
| `notes` | TEXT | Nullable | Justification for stock requisition |
| `reviewed_by_id` | UUID | FK -> `users`, Nullable | Pharmacy Department Admin |
| `reviewed_at` | TIMESTAMPTZ | Nullable | Approval / Rejection timestamp |
| `rejection_reason`| TEXT | Nullable | Reason if rejected by Admin |
| `created_at` | TIMESTAMPTZ | Auto now add | Timestamp |

#### 4. `pharmacy_purchase_request_items`
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Item ID |
| `purchase_request_id` | UUID | FK -> `pharmacy_purchase_requests` | Parent PR |
| `medicine_id` | UUID | FK -> `pharmacy_medicines` | Requisitioned SKU |
| `current_stock` | INTEGER | Not Null | Stock level at time of request |
| `requested_quantity` | INTEGER | Not Null | Quantity requested |
| `estimated_unit_cost`| DECIMAL(10,2)| Not Null | Estimated cost per unit |

#### 5. `pharmacy_purchase_orders` (Vendor Purchase Orders)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | PO ID |
| `po_number` | VARCHAR(50) | Unique, Indexed | E.g. `PO-202610-0001` |
| `purchase_request_id` | UUID | FK -> `pharmacy_purchase_requests`, Nullable | Linked approved PR |
| `supplier_id` | UUID | FK -> `pharmacy_suppliers`, Indexed | Target supplier |
| `issued_by_id` | UUID | FK -> `users` | Approving Pharmacy Admin |
| `status` | VARCHAR(30) | Indexed | `ISSUED`, `PARTIALLY_RECEIVED`, `COMPLETED`, `CANCELLED` |
| `total_amount` | DECIMAL(12,2)| Not Null | Total PO monetary commitment |
| `expected_delivery_date` | DATE | Nullable | Promised delivery SLA |
| `supplier_invoice_number` | VARCHAR(100)| Nullable | Invoice entered on receipt |
| `created_at` | TIMESTAMPTZ | Auto now add | PO dispatch timestamp |

#### 6. `pharmacy_batches` (Inventory by Batch & Expiry)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Batch record ID |
| `medicine_id` | UUID | FK -> `pharmacy_medicines`, Indexed | Reference to medicine SKU |
| `purchase_order_id`| UUID | FK -> `pharmacy_purchase_orders`, Nullable | Originating PO |
| `supplier_id` | UUID | FK -> `pharmacy_suppliers`, Nullable | Sourcing vendor |
| `batch_number` | VARCHAR(50) | Indexed | Manufacturer lot number |
| `quantity_available` | INTEGER | Check >= 0 | Sellable units currently in store |
| `quantity_reserved` | INTEGER | Default: 0 | Locked during active counter verification |
| `cost_price` | DECIMAL(10,2) | Not Null | Actual purchase cost |
| `expiry_date` | DATE | Indexed, Not Null | Expiration date for FEFO ordering |
| `manufacturing_date`| DATE | Nullable | Production date |
| `storage_location`| VARCHAR(100) | Default: `'Rack A-01'` | Shelf / Bin / Refrigerator (2-8°C) |
| `status` | VARCHAR(30) | Default: `'ACTIVE'` | `ACTIVE`, `QUARANTINED`, `EXPIRED`, `DEPLETED` |
| `created_at` | TIMESTAMPTZ | Auto now add | Inbound timestamp |

#### 7. `pharmacy_dispense_orders` (Fulfillment & Billing Head)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Dispense Order ID |
| `order_number` | VARCHAR(50) | Unique, Indexed | E.g. `DSP-202610-00042` |
| `prescription_id` | UUID | FK -> `clinical.Prescription`, Nullable | Linked clinical Rx |
| `patient_id` | UUID | FK -> `patients.Patient`, Indexed | Patient recipient |
| `encounter_type` | VARCHAR(20) | Indexed | `OPD`, `IPD`, or `OTC` |
| `admission_id` | UUID | FK -> `ipd.InpatientAdmission`, Nullable | Admission ID if IPD |
| `ward_name` | VARCHAR(100) | Nullable | Target ward if IPD |
| `settlement_mode` | VARCHAR(30) | Indexed, Not Null | `PAY_AT_PHARMACY`, `PAY_AT_RECEPTION`, `INSURANCE`, `CORPORATE`, `CREDIT`, `IPD_RUNNING_BILL` |
| `payment_status` | VARCHAR(30) | Indexed, Not Null | `PAID`, `UNPAID`, `PARTIALLY_PAID`, `INSURANCE_PENDING`, `CORPORATE_PENDING`, `CREDIT_AUTHORIZED` |
| `payment_method` | VARCHAR(30) | Nullable | `CASH`, `CARD`, `UPI`, `WALLET`, `TPA_CLAIM`, `CORPORATE_LEDGER`, `CREDIT_LINE` |
| `total_amount` | DECIMAL(10,2) | Not Null | Gross total of dispensed medications |
| `co_pay_amount` | DECIMAL(10,2) | Default: 0.00 | Out-of-pocket amount payable by patient |
| `payer_covered_amount`| DECIMAL(10,2)| Default: 0.00 | Covered by Insurance TPA or Corporate |
| `insurance_policy_number`| VARCHAR(100)| Nullable | Insurance policy / member number |
| `tpa_preauth_code` | VARCHAR(100)| Nullable | TPA cashless authorization code |
| `corporate_client_id` | VARCHAR(100)| Nullable | Empanelled corporate organization ID |
| `corporate_employee_id` | VARCHAR(100)| Nullable | Employee / Beneficiary badge number |
| `credit_facility_account`| VARCHAR(100)| Nullable | Internal hospital staff / VIP credit line # |
| `credit_authorized_by_id`| UUID | FK -> `users`, Nullable | Hospital Admin who authorized credit |
| `status` | VARCHAR(30) | Indexed | `PENDING`, `AWAITING_STOCK`, `VERIFIED`, `DISPENSED`, `PARTIAL`, `CANCELLED` |
| `billing_invoice_id` | UUID | FK -> `billing.Invoice`, Nullable | Created invoice or ledger link |
| `dispensed_by_id` | UUID | FK -> `users`, Nullable | Pharmacist who dispensed |
| `dispensed_at` | TIMESTAMPTZ | Nullable | Physical handover timestamp |
| `created_at` | TIMESTAMPTZ | Auto now add | Order creation timestamp |

#### 8. `pharmacy_otc_sales` (Over-the-Counter Walk-in POS)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | OTC Sale ID |
| `sale_number` | VARCHAR(50) | Unique, Indexed | E.g. `OTC-202610-0012` |
| `customer_name` | VARCHAR(150) | Default: `'Walk-in Customer'` | Customer or Patient name |
| `customer_phone`| VARCHAR(50) | Nullable | Contact number for digital receipt |
| `registered_patient_id` | UUID | FK -> `patients.Patient`, Nullable | Linked patient if existing UHID |
| `total_amount` | DECIMAL(10,2) | Not Null | Bill total |
| `payment_mode` | VARCHAR(50) | Default: `'CASH'` | `CASH`, `CARD`, `UPI`, `PENDING_CASHIER` |
| `cashier_settled` | BOOLEAN | Default: False | True if settled directly at pharmacy POS |
| `sold_by_id` | UUID | FK -> `users` | OPD Pharmacist |
| `created_at` | TIMESTAMPTZ | Auto now add | Timestamp |

#### 9. `pharmacy_returns` (Patient & Ward Return Records)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Return Record ID |
| `return_number` | VARCHAR(50) | Unique, Indexed | E.g. `RET-202610-0005` |
| `original_dispense_order_id`| UUID | FK -> `pharmacy_dispense_orders` | Linked original dispense |
| `patient_id` | UUID | FK -> `patients.Patient` | Patient |
| `return_type` | VARCHAR(20) | Indexed | `PATIENT_OPD` or `WARD_IPD` |
| `total_refund_amount` | DECIMAL(10,2)| Not Null | Value refunded / credited |
| `credit_note_id` | UUID | FK -> `billing.Invoice`, Nullable | Generated billing credit ledger |
| `reason` | TEXT | Not Null | Return justification (discontinued, adverse effect) |
| `condition_verified` | BOOLEAN | Default: True | Package intact, sealed, non-cold-chain |
| `processed_by_id`| UUID | FK -> `users` | Pharmacist processing return |
| `created_at` | TIMESTAMPTZ | Auto now add | Timestamp |

#### 10. `pharmacy_controlled_drug_register` (Narcotics & Schedule X Log)
| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | UUID | Primary Key | Register Entry ID |
| `entry_number` | VARCHAR(50) | Unique, Indexed | Sequential statutory entry ID |
| `medicine_id` | UUID | FK -> `pharmacy_medicines` | Controlled substance SKU |
| `batch_id` | UUID | FK -> `pharmacy_batches` | Specific batch decremented |
| `patient_id` | UUID | FK -> `patients.Patient` | Recipient patient |
| `prescribing_doctor_name`| VARCHAR(150)| Not Null | Prescribing consultant |
| `doctor_license_number` | VARCHAR(100)| Not Null | Doctor medical council registration # |
| `quantity_dispensed` | INTEGER | Not Null | Units dispensed |
| `balance_stock_after` | INTEGER | Not Null | Statutory verified remaining balance |
| `primary_pharmacist_id`| UUID | FK -> `users` | Dispensing pharmacist |
| `witness_staff_id` | UUID | FK -> `users` | Second staff witness (2nd Pharmacist / Head Nurse) |
| `dispense_order_id`| UUID | FK -> `pharmacy_dispense_orders` | Linked fulfillment order |
| `created_at` | TIMESTAMPTZ | Auto now add | Exact physical handover timestamp |

---

## 3. API Specification

Global Prefix: `/api/v1/pharmacy`  
Authentication: `Authorization: Bearer <token>`

### 3.1 Procurement & Inbound Stock Flow (The Major Workflow)

#### 1. `POST /api/v1/pharmacy/purchase-requests`
- **Role:** `INVENTORY_MANAGER`
- **Payload:**
```json
{
  "priority": "URGENT",
  "notes": "Paracetamol and Amoxicillin stock below critical reorder limit.",
  "items": [
    { "medicineId": "med-uuid-01", "requestedQuantity": 500, "estimatedUnitCost": 0.35 },
    { "medicineId": "med-uuid-02", "requestedQuantity": 200, "estimatedUnitCost": 1.20 }
  ]
}
```
- **Response:** `201 Created` with `PR-202610-0001` (Status: `SUBMITTED`).

#### 2. `POST /api/v1/pharmacy/purchase-requests/:id/review`
- **Role:** `PHARMACY_ADMIN`
- **Payload:**
```json
{
  "action": "APPROVE", // or "REJECT"
  "notes": "Approved for vendor procurement. Dispatched to primary distributor."
}
```
- **Backend Effect:** Status transitions to `APPROVED`. Automatically generates draft `PurchaseOrder` ready for supplier dispatch.

#### 3. `POST /api/v1/pharmacy/purchase-orders/:id/issue`
- **Role:** `PHARMACY_ADMIN`
- **Payload:** `{ "supplierId": "sup-uuid-pfizer", "expectedDeliveryDate": "2026-10-08" }`
- **Backend Effect:** Sends official electronic PO to supplier; status marked `ISSUED`.

#### 4. `POST /api/v1/pharmacy/goods-receipt` (Receive Stock into Batches)
- **Role:** `INVENTORY_MANAGER`
- **Payload:**
```json
{
  "purchaseOrderId": "po-uuid-01",
  "supplierInvoiceNumber": "INV-PFIZER-88219",
  "batches": [
    {
      "medicineId": "med-uuid-01",
      "batchNumber": "B-2026-104",
      "quantityReceived": 500,
      "costPrice": 0.35,
      "manufacturingDate": "2026-08-01",
      "expiryDate": "2028-08-01",
      "storageLocation": "Rack B-03"
    }
  ]
}
```
- **Backend Effect:**
  - Creates new `pharmacy_batches` records.
  - Updates `pharmacy_medicines` live stock.
  - Checks if any prescriptions were in `AWAITING_STOCK` hold for `med-uuid-01` and releases them back into active queue.

---

### 3.2 Prescription Dispensing & Settlement Dispatch (All 6 Modes)

#### `POST /api/v1/pharmacy/dispense`
- **Role:** `OPD_PHARMACIST` (OPD), `IPD_PHARMACIST` (IPD)
- **Common Base Payload:**
```json
{
  "prescriptionId": "rx-uuid-0012",
  "patientId": "pt-uuid-45",
  "items": [
    {
      "medicineId": "med-uuid-atorvastatin",
      "batchId": "batch-uuid-b2026-92",
      "quantity": 30,
      "unitPrice": 0.60
    }
  ],
  "allergyOverrideReason": null
}
```

- **Adaptive Payload per Settlement Mode:**

**1. Mode: Pay At Pharmacy (`PAY_AT_PHARMACY`)**
```json
{
  "settlementMode": "PAY_AT_PHARMACY",
  "paymentMethod": "UPI", // "CASH", "CARD", "UPI"
  "amountPaid": 18.00,
  "transactionReference": "UPI-REF-992817412"
}
```
*Backend Effect:* Creates finalized `billing.Invoice` (`status: PAID`) and linked `Payment` record; decrements stock; prints POS tax receipt.

**2. Mode: Pay At Reception (`PAY_AT_RECEPTION`)**
```json
{
  "settlementMode": "PAY_AT_RECEPTION",
  "handoverPolicy": "PRE_PAID" // or "POST_PAID"
}
```
*Backend Effect:* Appends line items to active visit invoice (`status: UNPAID`); generates scannable barcode voucher slip; flips pharmacy order status to `AWAITING_CASHIER_PAYMENT`.

**3. Mode: Insurance (`INSURANCE`)**
```json
{
  "settlementMode": "INSURANCE",
  "tpaProviderId": "tpa-uuid-starhealth",
  "policyNumber": "STAR-POL-8839210",
  "tpaPreauthCode": "AUTH-2026-88192",
  "approvedCoveredAmount": 15.00,
  "patientCopayAmount": 3.00,
  "copaySettlementMode": "PAY_AT_PHARMACY" // patient pays the $3.00 co-pay at counter
}
```
*Backend Effect:* Books $15.00 to Insurance TPA receivable (`status: INSURANCE_PENDING`); collects $3.00 patient co-pay invoice; records pre-auth audit proof.

**4. Mode: Corporate (`CORPORATE`)**
```json
{
  "settlementMode": "CORPORATE",
  "corporateClientId": "corp-uuid-tech-mahindra",
  "corporateEmployeeId": "TM-EMP-40192",
  "authorizationLetterRef": "AUTH-LTR-OCT-44",
  "corporateCoveredAmount": 18.00,
  "patientCopayAmount": 0.00,
  "digitalSignatureRef": "sig-blob-991823"
}
```
*Backend Effect:* Posts $18.00 debit to Corporate Client Running Account; records employee badge & authorization reference; emits corporate voucher.

**5. Mode: Credit (`CREDIT`)**
```json
{
  "settlementMode": "CREDIT",
  "creditFacilityAccount": "STAFF-DR-VANCE-CREDIT",
  "creditAuthorizedById": "usr-uuid-medical-superintendent",
  "approvalNotes": "Approved under Hospital Staff Healthcare Allowance / ER Credit"
}
```
*Backend Effect:* Validates available credit limit; writes debit to Patient/Staff Revolving Credit Ledger (`status: CREDIT_AUTHORIZED`); dispenses immediately without upfront cash.

**6. Mode: IPD Running Bill (`IPD_RUNNING_BILL`)**
```json
{
  "settlementMode": "IPD_RUNNING_BILL",
  "admissionId": "adm-uuid-icu-bed-02",
  "wardName": "ICU Suite",
  "bedNumber": "Bed 02"
}
```
*Backend Effect:* Atomically appends line items to active Inpatient Admission ledger (`category: IPD`, `source: Pharmacy`); updates live admission running balance; triggers top-up alert if advance deposit drops below 20%; updates ward MAR.

---

### 3.3 Over-The-Counter (OTC) Walk-in Sales

#### `POST /api/v1/pharmacy/otc/dispense`
- **Role:** `OPD_PHARMACIST`
- **Payload:**
```json
{
  "customerName": "Robert Sterling (Walk-in)",
  "customerPhone": "+1 555-019-2834",
  "items": [
    { "medicineId": "med-uuid-paracetamol", "quantity": 10 }
  ],
  "paymentMode": "CASH"
}
```
- **Validation:** Verifies `requires_prescription === False`.
- **Backend Effect:** Decrements FEFO batch, logs `pharmacy_otc_sales`, creates Cashier POS invoice item.

---

### 3.4 Returns & Medication Restocking

#### `POST /api/v1/pharmacy/returns`
- **Role:** `OPD_PHARMACIST` (Patient returns) / `IPD_PHARMACIST` (Ward returns)
- **Payload:**
```json
{
  "dispenseOrderId": "dsp-uuid-01",
  "returnType": "PATIENT_OPD",
  "reason": "Doctor discontinued medication due to mild nausea.",
  "items": [
    { "dispenseItemId": "dsp-item-01", "quantityReturned": 14, "action": "RESTOCK" } // or "QUARANTINE"
  ]
}
```
- **Backend Effect:** Re-increments batch stock if intact, generates credit note in Billing ledger.

---

### 3.5 Controlled Drug & Narcotic Dispensing

#### `POST /api/v1/pharmacy/controlled-drug/dispense`
- **Role:** `OPD_PHARMACIST`, `IPD_PHARMACIST` (Requires 2 Authenticated Staff)
- **Payload:**
```json
{
  "dispenseOrderId": "dsp-uuid-morphine",
  "medicineId": "med-uuid-morphine-10mg",
  "batchId": "batch-uuid-morphine",
  "quantity": 2,
  "prescribingDoctorName": "Dr. Kevin Vance, MD",
  "doctorLicenseNumber": "MCI-SURG-88192",
  "witnessStaffId": "usr-uuid-head-nurse",
  "witnessPassword": "VerifiedPin123!"
}
```
- **Backend Effect:** Atomic write to `pharmacy_controlled_drug_register`, verified dual sign-off, immediate balance audit update.

---

## 4. Permissions Matrix (Expanded Scope)

| Action / Capability | OPD Pharmacist | IPD Pharmacist | Inventory Manager | Pharmacy Admin | Doctor | Nurse | Cashier | Hospital Admin |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Approve / Reject Purchase Requests (PR)** | ❌ No | ❌ No | ❌ No | ✅ Execute | ❌ No | ❌ No | ❌ No | ✅ Override |
| **Issue Purchase Order (PO)** | ❌ No | ❌ No | ❌ No | ✅ Execute | ❌ No | ❌ No | ❌ No | ✅ Audit |
| **Monitor Operations & Live Queues** | ✅ OPD Only | ✅ IPD Only | ✅ Store Only | ✅ Full Department | ❌ No | ❌ No | ❌ No | ✅ Full |
| **View Reports & Financial Analytics** | ❌ No | ❌ No | ❌ No | ✅ Full | ❌ No | ❌ No | ❌ No | ✅ Full |
| **Manage Staff Roster & Shifts** | ❌ No | ❌ No | ❌ No | ✅ Full | ❌ No | ❌ No | ❌ No | ✅ Full |
| **Formulary Tariff Pricing** | ❌ No | ❌ No | ❌ No | ✅ Manage | ❌ No | ❌ No | ❌ No | ✅ Manage |
| **Supplier Master Management**| ❌ No | ❌ No | ❌ No | ✅ Manage | ❌ No | ❌ No | ❌ No | ✅ Manage |
| **Dispense OPD / OTC Medicines** | ✅ Execute | ❌ No | ❌ No | ❌ STRICTLY NO | ❌ No | ❌ No | ❌ No | ❌ No |
| **Issue IPD Ward Medicines** | ❌ No | ✅ Execute | ❌ No | ❌ STRICTLY NO | ❌ No | ❌ No | ❌ No | ❌ No |
| **Adjust Stock / Write-Offs / GRN** | ❌ No | ❌ No | ✅ Execute | ❌ STRICTLY NO | ❌ No | ❌ No | ❌ No | ❌ No |
| **Controlled Drug Dual Sign-Off**| ✅ Primary | ✅ Primary | ❌ No | ✅ Audit | ❌ No | ✅ Witness | ❌ No | ✅ Audit |
| **Process Medication Return** | ✅ OPD Only| ✅ IPD Only| ❌ No | ✅ Audit | ❌ No | ❌ No | ❌ No | ❌ No |
| **Settle Cash Payment** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Settle | ❌ No |

> [!NOTE]
> **Separation of Concerns Enforcement:**  
> The `PHARMACY_ADMIN` role is strictly an administrative, analytical, and governance role. Under no circumstances may an Admin account directly execute physical **Dispensing**, **Ward Issuing**, or **Stock Adjustments**. These physical custody operations are legally restricted to licensed `OPD_PHARMACIST`, `IPD_PHARMACIST`, and `INVENTORY_MANAGER` cadres to prevent fraud, misappropriation, and inventory falsification.

---

## 5. Integration Map

### 5.1 Billing Integration
- **OPD Dispense:** `Doctor ──► Prescription ──► Queue ──► Verify (Read-Only) ──► Dispense ──► Stock & Bill Mutate`. Creates invoice line item under selected settlement engine.
- **IPD Ward Issue (The Inpatient Billing Anchor):**
  ```
  Ward Request ──► Issue ──► Admission Ledger Update
  ```
  Medications and infusions issued to admitted inpatients are atomically appended to the patient's active `InpatientAdmission` running billing ledger (`category: IPD`, `source: Pharmacy`) at the exact moment of physical issue. No upfront cash is collected. This prevents unbilled medications at discharge, enables real-time deposit exhaustion alerts, and maintains audit integrity for insurance TPA clearance.
- **OTC Sale:** Creates immediate POS counter invoice marked `PAID` or routed to Cashier.
- **Returns:** Generates negative credit line item (`REFUND_PHARMACY`) balancing the ledger.

### 5.2 Hospital Admin & Procurement Integration
- **Procurement Approvals:** Pharmacy Admin approval feeds into Hospital Financial Commitments.
- **Supplier Master:** Synced with hospital vendor management registry.
- **Department Setup:** Roster and shift allocation hosted under the unified Department Workspace engine.

---

## 6. Comprehensive Billing Architecture & The 6 Settlement Engines

The Pharmacy module natively integrates with the Hospital Billing Engine across six distinct financial settlement mechanisms:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 6 PHARMACY SETTLEMENT ENGINES                                │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ 1. PAY AT PHARMACY│ 2. PAY AT RECEP.  │ 3. INSURANCE TPA  │ 4. CORPORATE      │ 5. CREDIT        │ 6. IPD RUNNING BILL
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────┤
│ Counter POS       │ Central Cashier   │ Cashless Pre-Auth │ B2B Institutional │ VIP / Staff      │ Ward Admission
│ Immediate Cash/UPI│ Open Visit Bill   │ Co-pay Split      │ Direct Corporate  │ Approved Limit   │ Real-time MAR Sync
│ Status: PAID      │ Status: UNPAID    │ Status: TPA_PEND. │ Status: CORP_PEND.│ Status: CREDIT   │ Consolidated Final
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴──────────────────┴──────────────────┘
```

### 6.1 Engine 1: Pay At Pharmacy (Direct Counter POS Settlement)
- **Use Case:** Walk-in OPD prescription dispense or counter OTC sale where the patient chooses to pay immediately at the pharmacy counter.
- **Supported Payment Modes:** Cash, Credit/Debit Card (POS swipe/chip), UPI / QR Code, Net Banking, Patient Health Wallet.
- **Data Mutation & Financial Mechanics:**
  1. Pharmacist selects settlement mode: `PAY_AT_PHARMACY`.
  2. Subtotal, applicable hospital discounts, and GST/taxes are computed.
  3. Pharmacist enters tendered cash or confirms payment gateway transaction reference.
  4. System invokes `billingService` to create a finalized `Invoice` (`category: PHARMACY`, `status: PAID`) and linked `Payment` record in a single atomic transaction.
  5. The pharmacy receipt printer emits a statutory **Tax Invoice & Dispense Receipt**.
  6. The transaction immediately posts to the **Pharmacy Counter Cash Drawer & Shift Handover Ledger**.

### 6.2 Engine 2: Pay At Reception / Central Billing (Token-Linked Deferred Billing)
- **Use Case:** Outpatient undergoing an integrated clinical journey (e.g. Doctor Consultation + Lab Diagnostics + Pharmacy Medicines) who settles one single consolidated bill at the central cashier counter before departure.
- **Data Mutation & Financial Mechanics:**
  1. Pharmacist verifies prescription and confirms batch allocation.
  2. Pharmacist selects settlement mode: `PAY_AT_RECEPTION`.
  3. System appends line items (`source: Pharmacy`) to the patient's existing active appointment invoice (or creates an open invoice with `status: UNPAID`).
  4. Pharmacist generates a **Pharmacy Dispense Slip** with a scannable Barcode & QR Code.
  5. **Handover Protocol Policy:**
     - *Mode A (Pre-Paid Handover):* Patient takes slip to Reception/Cashier; once settled, the Pharmacy Queue automatically flips status to `PAYMENT_CONFIRMED (Green)` and pharmacist hands over the bag.
     - *Mode B (Post-Paid Handover):* Pharmacist hands over labeled medicine with invoice slip, and exit billing gate verifies payment before patient leaves premises.

### 6.3 Engine 3: Insurance (TPA / Health Insurance Pre-Authorization & Claims)
- **Use Case:** Patient insured under an empanelled Health Insurance / Third-Party Administrator (TPA) policy (e.g. Star Health, MediBuddy, ICICI Lombard, Care Health).
- **Data Mutation & Financial Mechanics:**
  1. Pharmacist selects settlement mode: `INSURANCE`.
  2. System loads patient insurance dossier: `TPA Provider`, `Policy Number`, `Pre-Auth Approval Code`, `Approved Limit`.
  3. Formulary rates automatically switch to agreed contractual institutional `tpa_price`.
  4. **Co-Pay & Deductible Computation:**
     - Non-covered items (e.g. cosmetic ointments, unapproved supplements, syringes) and patient co-pay percentage (e.g. 10%) are segregated into a direct patient out-of-pocket invoice.
     - The patient settles the co-pay via *Pay At Pharmacy* or *Pay At Reception*.
     - The covered balance is committed to the **Insurance TPA Claims Receivable Ledger** (`status: INSURANCE_PENDING`).
  5. Dispense order records `tpa_preauth_code` and policy details for audit submission.

### 6.4 Engine 4: Corporate / Institutional Sponsorship (B2B Empanelled Client)
- **Use Case:** Patient is an employee or registered beneficiary of an empanelled corporate partner (e.g. Indian Railways, CGHS, Tech Mahindra Wellness, Oil & Natural Gas Corp).
- **Data Mutation & Financial Mechanics:**
  1. Pharmacist selects settlement mode: `CORPORATE`.
  2. System verifies Corporate Client Master (`corporate_client_id`, `corporate_employee_id`, `authorization_letter_ref`).
  3. Sells at negotiated corporate schedule rates.
  4. Out-of-policy medications are separated into a patient co-pay slip.
  5. Authorized corporate amount is booked as an Accounts Receivable debit against the **Corporate Organization Running Account**.
  6. Pharmacist captures digital patient signature on the Corporate Dispense Voucher.
  7. Invoices are batched for monthly institutional B2B statements and claims submission.

### 6.5 Engine 5: Hospital Credit Facility (Approved Staff / VIP / Emergency Credit)
- **Use Case:** Approved credit line for hospital doctors, staff healthcare allowance, executive VIP patients, or acute life-threatening emergency credit authorized by the Medical Superintendent / Hospital Admin.
- **Data Mutation & Financial Mechanics:**
  1. Pharmacist selects settlement mode: `CREDIT`.
  2. System verifies available credit balance (`available_credit_balance >= total_amount`).
  3. Requires mandatory selection / input of `credit_authorized_by_id` (Admin user).
  4. Medicine is dispensed immediately without upfront cash collection.
  5. Dispense order records `payment_status: CREDIT_AUTHORIZED`.
  6. Posts directly to the **Patient / Staff Revolving Credit Ledger** for periodic settlement or monthly payroll deduction.

### 6.6 Engine 6: IPD Running Bill (Inpatient Admission Consolidated Ledger)

```
Ward Request ──► Issue ──► Admission Ledger Update
```

- **Use Case:** Medications and intravenous infusions issued to admitted inpatients across General Wards, Semi-Private, ICU, CCU, or OT suites.
- **Why this must be atomic:** Without immediate ledger synchronization upon issue, IPD billing fails at discharge — discharged patients walk out without paying for ward medications, interim insurance reconciliations reject claims, and pharmacy inventory becomes uncollectible bad debt.
- **Data Mutation & Financial Mechanics:**
  1. IPD Pharmacist fulfills medication requests off the inpatient MAR / ward requisition.
  2. Settlement mode is locked to `IPD_RUNNING_BILL`.
  3. **Zero upfront cash collection from patient, attendants, or ward nurses.**
  4. Line items are atomically committed directly to the `InpatientAdmission` running billing ledger (`category: IPD`, `source: Pharmacy`).
  5. The system dynamically updates admission totals:
     $$\text{Inpatient Total} = \text{Bed Charges} + \text{Consultations} + \text{Surgeries} + \text{Diagnostics} + \mathbf{Pharmacy\ Meds} - \text{Advance Deposit}$$
  6. The updated bill is visible in real-time to the **Ward Manager** on the Inpatient Census and to the patient family.
  7. If total running charges cross 80% of the patient's Inpatient Advance Deposit, the system triggers an automated **"Advance Top-Up Alert"** to the Reception desk.
  8. Final consolidation, insurance clearance, and settlement occur at patient discharge.
