# NorthHospital HMS — Pharmacy Workflows & Logic Flows

**Document Version:** 2.0  
**Design Standard:** Conforms to `hms-design-bible.md`  
**Module:** Clinical Pharmacy, Ward Supply & Complete Procurement Cycle  

---

# 1. Procurement Cycle: Request to Stock Receipt (Major Workflow)

```
[ Stock Level Drops Below Reorder Level ] OR [ Anticipated Clinical Demand ]
        │
        ▼ (Inventory Manager notices low stock indicator)
┌────────────────────────────────────────────────────────┐
│ STEP 1: CREATE PURCHASE REQUEST (PR)                   │
│ Actor: Inventory Manager                               │
│ Screen: `/pharmacy?view=inventory&tab=procurement`     │
├────────────────────────────────────────────────────────┤
│ - Selects Formularies needing reorder                  │
│ - Sets priority: ROUTINE, URGENT, or STAT              │
│ - Enters requested quantities & estimated unit cost    │
│ - Clicks "Submit Purchase Request"                     │
│ - Status: `SUBMITTED` (PR-202610-0001)                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Notification alert pushed to Pharmacy Admin)
┌────────────────────────────────────────────────────────┐
│ STEP 2: PHARMACY ADMIN REVIEW & APPROVAL               │
│ Actor: Pharmacy Department Admin                       │
│ Screen: `/department/pharmacy?tab=procurement`         │
├────────────────────────────────────────────────────────┤
│ - Inspects department budget, monthly burn rate        │
│ - Reviews requested items & justification              │
│ - Choice A: Reject ──► Reason recorded, PR status `REJ`│
│ - Choice B: Approve ──► Status: `APPROVED`             │
│   System converts approved PR into official PO Draft   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ STEP 3: PURCHASE ORDER (PO) DISPATCH                   │
│ Actor: Pharmacy Department Admin                       │
├────────────────────────────────────────────────────────┤
│ - Selects verified Supplier from Supplier Master       │
│ - Sets expected delivery date SLA                      │
│ - Dispatches PO via electronic PDF / Email to Supplier │
│ - Status: `ISSUED` (PO-202610-0001)                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Physical delivery arrives at hospital loading dock)
┌────────────────────────────────────────────────────────┐
│ STEP 4: GOODS RECEIPT & BATCH REGISTRATION (GRN)       │
│ Actor: Inventory Manager                               │
│ Screen: "Receive Stock" Drawer                         │
├────────────────────────────────────────────────────────┤
│ - Inspects package seals & cold-chain data loggers     │
│ - Inputs Supplier Invoice #                            │
│ - Registers manufacturer Batch/Lot Numbers             │
│ - Inputs Manufacturing & Expiration Dates              │
│ - Inputs Actual Delivered Quantities                   │
│ - Clicks "Post Inbound Shipment"                       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
═══════════════════════════════════════════════════════════════════════
                 ATOMIC GOODS RECEIPT TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Generates new `pharmacy_batches` records with FEFO sorting
  2. Updates `pharmacy_medicines` live available stock
  3. Writes `pharmacy_stock_transactions` entry (`RECEIVE`)
  4. Auto-resolves any prescriptions on "Awaiting Stock" hold
  5. Marks Purchase Order status as `COMPLETED`
═══════════════════════════════════════════════════════════════════════
```

---

# 2. OPD Walk-in Prescription Dispensing Flow

### 2.1 The Canonical Execution Order

```
Doctor
  │
  ▼ (Clinical decision & e-Prescription signed)
Prescription
  │
  ▼ (Routed automatically to OPD queue)
Pharmacy Queue
  │
  ▼ (Pharmacist reviews dosages, interactions, allergies)
Verification (READ-ONLY)
  │
  ▼ (Pharmacist clicks "Dispense & Bill")
Dispense
  │
  ▼ (FEFO batches atomically decremented)
Inventory Update
  │
  ▼ (Committed to selected Billing Settlement Engine)
Billing Update
```

> [!WARNING]
> **MANDATORY INVARIANT: INVENTORY REDUCES ONLY ON DISPENSE**  
> **Forbidden Anti-Pattern:**  
> `Doctor Prescribing ───❌───► Inventory Reduced`  
> A doctor creating a prescription **NEVER** reduces stock inventory. Stock levels and billing ledgers remain strictly untouched until the Pharmacist performs the physical **Dispense** action. Verification is 100% read-only.

### 2.2 Detailed Step-by-Step Logic Flow

```
[ Doctor Consultation ]
        │
        ▼ (Doctor finalizes Consultation & signs e-Prescription — NO STOCK MUTATION)
[ Prescription Generated ]
        │
        ▼ (Encounter Type = OPD -> Filtered into OPD Pharmacist Queue)
[ OPD Dispensing Queue ] ──> Pharmacist clicks "Verify / Open Drawer"
        │
        ▼
[ Prescription Detail Drawer Opens ]
        │
        ├── 1. Clinical Review (Dose, Frequency, Route, Duration)
        │
        ├── 2. Allergy & Cross-Reactivity Engine
        │       │
        │       ├─► [ No Conflict ] ──► Green Safety Badge Displayed
        │       │
        │       └─► [ Conflict Detected ] ──► Red Warning Banner Triggered
        │                 │
        │                 ├─► Choice A: Contact Doctor to amend Rx ──► Loop back to Doctor
        │                 │
        │                 └─► Choice B: Clinical Override (Requires Reason Modal) ──► Logged to Audit
        │
        ├── 3. Live Batch Stock Lookup (FEFO: First-Expiry, First-Out)
        │       │
        │       ├─► Full Stock Available ──► Batches auto-allocated
        │       │
        │       ├─► Partial Stock Available ──► Partial Dispense (remainder backordered)
        │       │
        │       └─► Zero Stock ──► Rx placed on "Awaiting Stock" hold
        │
        ▼ (Pharmacist clicks "Dispense & Bill")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC DISPENSE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Decrement batch inventory in `pharmacy_batches`
  2. Create immutable entry in `pharmacy_stock_transactions`
  3. Send line items to Billing Engine (Appended to Patient Invoice)
  4. Append medication to Patient Permanent Medical Dossier
  5. Mark Prescription status as "FULFILLED"
═══════════════════════════════════════════════════════════════════════
        │
        ▼
[ Physical Medication Handover to Patient ]
  - Printed dosage instruction labels attached
  - Patient directed to Billing Counter / Cashier for settlement
```

---

# 3. IPD Ward Medication Request & Issue Flow

### 3.1 The Canonical IPD Execution Order

```
Ward Request
  │
  ▼ (Ordered on Inpatient Chart / MAR by Doctor)
IPD Pharmacist Queue
  │
  ▼ (Pharmacist picks unit doses & verifies MAR)
Issue to Ward
  │
  ▼ (Batch stock decremented & Nurse MAR updated)
Admission Ledger Update
```

> [!IMPORTANT]
> **CRITICAL IPD BILLING INVARIANT: IMMEDIATE ADMISSION LEDGER COMMIT**  
> ```
> Ward Request ──► Issue ──► Admission Ledger Update
> ```
> Every medication or IV infusion issued to an inpatient **MUST** atomically append to the active `InpatientAdmission` running billing ledger at the exact moment of physical issue.  
> **Why this is critical:**  
> 1. Prevents unbilled medications during discharge clearance.  
> 2. Ensures real-time financial tracking for the Ward Manager and patient family.  
> 3. Enables automated **Advance Deposit Depletion Warnings** (when bill crosses 80% of deposit).  
> 4. Prevents insurance TPA claim rejections caused by missing interim pharmacy billing logs.  
> **Zero upfront cash** is collected from ward nurses or attendants; the admission ledger is the sole financial authority.

### 3.2 Detailed Step-by-Step Logic Flow

```
[ Inpatient Doctor Round / Treatment Plan ]
        │
        ▼ (Doctor orders medication on Inpatient Chart)
[ Ward Medication Request Created ]
        │
        ▼ (Encounter Type = IPD -> Filtered into IPD Pharmacist Queue)
[ IPD Request Queue ] (Grouped by Ward: ICU, Ward A, Ward B, Maternity)
        │
        ▼ Pharmacist opens Ward Issue Drawer
[ Ward Issue Drawer ]
        │
        ├── 1. Verify Admission ID, Bed Number & Attending Consultant
        ├── 2. Check Patient Allergies against Inpatient Record
        ├── 3. Pick Batches from Central Stores (FEFO Allocation)
        │
        ▼ (Pharmacist clicks "Issue to Ward")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC ISSUE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Decrement central pharmacy batch stock
  2. Write inventory transaction (`ISSUE_IPD`)
  3. Append line item directly to Inpatient Admission Running Ledger
     (Tagged `IPD`, viewable by Ward Manager, settled at final discharge)
  4. Update Inpatient MAR (Medication Administration Record)
     Status: "AWAITING_SUPPLY" ──► "READY_TO_ADMINISTER"
═══════════════════════════════════════════════════════════════════════
        │
        ▼
[ Ward Nurse Receives Medication ]
  - Administers to patient at scheduled time
  - Toggles MAR to "ADMINISTERED" with nurse digital sign-off
```

---

# 4. Over-The-Counter (OTC) Walk-in Sale Flow

```
[ Customer / Patient arrives at Pharmacy Counter without a Doctor Rx ]
        │
        ▼
[ OPD Pharmacist opens "Quick OTC Sale" Modal ]
        │
        ├── Enters Customer Name & Mobile Number (or searches existing UHID)
        ├── Selects Non-Prescription Medication (System blocks Rx-only items)
        ├── Reviews live stock levels & auto-allocates FEFO batch
        ├── Selects Payment Mode: Cash, Card, UPI, or Send to Cashier
        │
        ▼ (Pharmacist clicks "Complete OTC Sale")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC OTC SALE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Decrement batch stock in `pharmacy_batches`
  2. Write `pharmacy_stock_transactions` entry (`DISPENSE_OTC`)
  3. Record entry in `pharmacy_otc_sales`
  4. Emit POS Cashier Receipt directly to counter receipt printer
═══════════════════════════════════════════════════════════════════════
```

---

# 5. Medication Returns & Credit Note Flow

```
[ Patient brings back unused medication ] OR [ Ward returns unused ampoules ]
        │
        ▼
[ Pharmacist opens "Process Return" Drawer ]
        │
        ├── Enters original Dispense Order # (e.g. DSP-202610-00042)
        ├── Inspects Returned Items:
        │     - Packaging intact & blister foil unbroken?
        │     - Not a cold-chain (refrigerated) item?
        │     - Return within 48-hour hospital policy window?
        │
        ├── Selects Return Action per line item:
        │     - `RESTOCK`: Return into active batch inventory
        │     - `QUARANTINE / WRITE-OFF`: Damaged, cannot be re-dispensed
        │
        ├── Enters mandatory return justification reason
        │
        ▼ (Pharmacist clicks "Confirm Return & Refund")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC RETURN TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Re-increments batch quantity (if action = RESTOCK)
  2. Creates `pharmacy_returns` record
  3. Writes `pharmacy_stock_transactions` entry (`RETURN`)
  4. Generates Credit Note in Billing Engine balancing patient's ledger
═══════════════════════════════════════════════════════════════════════
```

---

# 6. Controlled Drug & Narcotic Dispensing Register Flow

```
[ Prescription with Narcotic / Schedule X Medication Arrives ]
(E.g. Morphine, Fentanyl, Ketamine, Midazolam)
        │
        ▼
[ System Flags: "CONTROLLED SUBSTANCE — STATUTORY DUAL VERIFICATION REQUIRED" ]
        │
        ├── 1. Primary Pharmacist verifies Doctor Medical Council Registration #
        ├── 2. Primary Pharmacist enters Dispense Quantity
        ├── 3. Secondary Witness Required (2nd Pharmacist or Head Nurse)
        │       - Witness enters Staff ID & PIN/Password
        │
        ▼ (Both staff confirm physical vault withdrawal)
═══════════════════════════════════════════════════════════════════════
           ATOMIC CONTROLLED SUBSTANCE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Decrement secure vault batch stock
  2. Record non-editable row in `pharmacy_controlled_drug_register`
     (Timestamp, Doctor License #, Patient UHID, Dispenser ID, Witness ID,
      Quantity Dispensed, Verified Remaining Vault Balance)
  3. Dispense order marked with green "DUAL VERIFIED" statutory seal
═══════════════════════════════════════════════════════════════════════
```

---

# 7. Comprehensive Billing Settlement Workflows (The 6 Payment Paths)

The Pharmacy module orchestrates six distinct billing settlement workflows. Every prescription or OTC interaction concludes in one of these six financial pathways:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SIX BILLING SETTLEMENT PATHWAYS                                  │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│ 1. PAY AT PHARMACY│ 2. PAY AT RECEP.  │ 3. INSURANCE TPA  │ 4. CORPORATE      │ 5. CREDIT       │ 6. IPD RUNNING BILL
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼─────────────────┤
│ Cash / Card / UPI │ Central Cashier   │ Cashless Pre-Auth │ B2B Institutional │ Staff / VIP / ER│ Ward Admission
│ Direct POS Receipt│ Barcode Slip      │ Co-pay Split      │ Direct Corporate  │ Limit Validation│ Real-time MAR Sync
│ Status: PAID      │ Status: UNPAID    │ Status: TPA_PEND. │ Status: CORP_PEND.│ Status: CREDIT  │ Final Discharge Settle
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴─────────────────┴────────────────────┘
```

---

### 7.1 Settlement Path 1: Pay At Pharmacy (Instant Counter POS Settlement)

```
[ Pharmacist verifies Prescription / OTC Cart ]
        │
        ▼ (Patient chooses to pay immediately at pharmacy counter)
[ Pharmacist selects "Pay At Pharmacy" ]
        │
        ├── 1. System computes Subtotal, Hospital Formulary Discounts, and GST
        ├── 2. Pharmacist selects Tender Mode: [Cash] [Card] [UPI / QR]
        │       - If Cash: System calculates change due based on tendered cash
        │       - If UPI: Dynamic payment QR code generated on counter terminal
        │       - If Card: Transaction reference code entered from POS swipe terminal
        │
        ▼ (Pharmacist clicks "Collect & Dispense")
═══════════════════════════════════════════════════════════════════════
               ATOMIC COUNTER POS SETTLEMENT TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Creates finalized `billing.Invoice` (`category: PHARMACY`, `status: PAID`)
  2. Creates linked `billing.Payment` record with method & reference
  3. Decrements inventory in `pharmacy_batches` (FEFO)
  4. Posts revenue to current Pharmacist Counter Shift Drawer
  5. Thermal receipt printer generates statutory Tax Invoice & Handover Slip
═══════════════════════════════════════════════════════════════════════
        │
        ▼
[ Labeled medicines handed over to patient with receipt ]
```

---

### 7.2 Settlement Path 2: Pay At Reception / Central Billing (Token-Linked Deferred)

```
[ Pharmacist verifies Prescription ]
        │
        ▼ (Patient has ongoing hospital consultations or tests)
[ Pharmacist selects "Pay At Reception" ]
        │
        ├── 1. System validates open Visit Encounter
        ├── 2. Generates Barcoded Pharmacy Dispense Slip (Token # e.g. PH-8821)
        ├── 3. Appends line items to patient's central Visit Bill (`status: UNPAID`)
        │
        ├── Policy Check: Pre-Paid Handover vs Post-Paid Handover
        │       │
        │       ├─► [ POLICY A: PRE-PAID HANDOVER ]
        │       │     - Medicines packed in pharmacy holding bin #
        │       │     - Patient visits Reception / Central Cashier with Token Slip
        │       │     - Central Cashier collects payment & issues official receipt
        │       │     - Webhook fires: Pharmacy Queue updates order to `PAYMENT_CONFIRMED (Green)`
        │       │     - Pharmacist verifies green status badge and hands over medicine bag
        │       │
        │       └─► [ POLICY B: POST-PAID HANDOVER ]
        │             - Pharmacist hands over medicine immediately with unbilled slip
        │             - Hospital exit barrier / security scans UHID to verify bill clearance
        │
        ▼
[ Dispense Order marked as FULFILLED once Central Cashier posts payment ]
```

---

### 7.3 Settlement Path 3: Insurance (TPA Pre-Authorization & Co-Pay Split)

```
[ Pharmacist verifies Prescription for Insured Patient ]
        │
        ▼
[ Pharmacist selects "Insurance / TPA" ]
        │
        ├── 1. System pulls patient's verified TPA Insurance Profile
        │       (TPA Name: Star Health / MediBuddy, Policy #, Pre-Auth Approval Code)
        │
        ├── 2. Pricing Engine switches to agreed Institutional Contractual Formulary Rates
        │
        ├── 3. Automated Split Engine:
        │       ┌────────────────────────────────────────────────────────┐
        │       │ Gross Prescribed Total:                      $120.00   │
        │       │ - TPA Admissible Cover (80% + Covered SKUs):  $96.00   │
        │       │ - Patient Co-Pay (20%):                       $20.00   │
        │       │ - Non-Covered Exclusions (Dietary/Cosmetic):   $4.00   │
        │       ├────────────────────────────────────────────────────────┤
        │       │ Patient Out-of-Pocket Balance:                $24.00   │
        │       │ TPA Claim Balance:                            $96.00   │
        │       └────────────────────────────────────────────────────────┘
        │
        ├── 4. Patient settles the $24.00 Co-Pay via Pay At Pharmacy or Reception
        │
        ▼ (Pharmacist confirms Pre-Auth Code & clicks "Dispense Insurance Order")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC INSURANCE DISPENSE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Co-pay settled and recorded with instant receipt
  2. Admissible claim ($96.00) booked into `insurance_claims_receivable`
     Status: `INSURANCE_PENDING` (Tagged with TPA Pre-Auth Code)
  3. Inventory decremented from `pharmacy_batches` (FEFO)
  4. Insurance Dispense Certificate generated with diagnosis & doctor license
═══════════════════════════════════════════════════════════════════════
```

---

### 7.4 Settlement Path 4: Corporate / Institutional Sponsorship (B2B Empanelled)

```
[ Pharmacist verifies Prescription for Corporate Beneficiary ]
        │
        ▼
[ Pharmacist selects "Corporate / Empanelled" ]
        │
        ├── 1. Pharmacist selects Corporate Account (e.g. Indian Railways, CGHS, TechM)
        ├── 2. Inputs / Scans Corporate Employee Badge ID & Authorization Letter Ref
        ├── 3. System validates valid credit ceiling and non-expired empanelment contract
        ├── 4. Rates automatically apply corporate discounted schedule
        │
        ├── 5. Verification Checklist:
        │       - Employee ID card physically checked
        │       - Prescription signed by empanelled doctor
        │       - Patient signs digital Corporate Dispense Voucher on counter stylus pad
        │
        ▼ (Pharmacist clicks "Approve Corporate Dispense")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC CORPORATE DISPENSE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Dispense order marked `CORPORATE_PENDING`
  2. Total debited to Corporate Account Running Accounts Receivable Ledger
  3. Stock decremented in `pharmacy_batches` (FEFO)
  4. Corporate voucher printed for monthly batch invoicing and B2B claims
═══════════════════════════════════════════════════════════════════════
```

---

### 7.5 Settlement Path 5: Hospital Credit Facility (Approved Staff / VIP / Emergency)

```
[ Prescription presented under Hospital Credit Facility ]
(Eligible: Hospital Consultants, Nursing Staff, Executive VIPs, Indigent Emergency ER)
        │
        ▼
[ Pharmacist selects "Credit Facility" ]
        │
        ├── 1. Selects Credit Account Category:
        │       - `STAFF_HEALTHCARE_ALLOWANCE`
        │       - `VIP_COURTESY_LINE`
        │       - `EMERGENCY_LIFE_SAVING_CREDIT`
        │
        ├── 2. System checks available authorized balance (`available_credit >= amount`)
        │
        ├── 3. Mandatory Authorization Credential:
        │       - Pharmacist selects Authorizing Official (Medical Superintendent / CFO)
        │       - Admin OTP or digital signature token validated
        │       - Enters mandatory justification note
        │
        ▼ (Pharmacist clicks "Authorize Credit & Dispense")
═══════════════════════════════════════════════════════════════════════
                  ATOMIC CREDIT DISPENSE TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Dispense order marked `payment_status: CREDIT_AUTHORIZED`
  2. Line items debited to Staff/VIP Credit Folio (Payroll deduction or periodic bill)
  3. Zero cash collected from recipient at counter
  4. Inventory decremented from `pharmacy_batches` (FEFO)
  5. Credit Voucher generated with dual sign-off (Recipient + Authorizer)
═══════════════════════════════════════════════════════════════════════
```

---

### 7.6 Settlement Path 6: IPD Running Bill (Inpatient Admission Consolidated Ledger)

```
[ Inpatient Doctor prescribes medication on Ward Chart / MAR ]
        │
        ▼ (Medication order received by IPD Pharmacist Queue)
[ IPD Pharmacist reviews Ward Requisition ]
        │
        ├── Settlement Mode is automatically locked to: `IPD_RUNNING_BILL`
        ├── 1. System pulls Inpatient Admission ID (e.g. `ADM-202610-0018`), Ward & Bed #
        ├── 2. Validates Active Inpatient Status (not discharged / not under billing lock)
        │
        ├── 3. Real-time Deposit Balance Check:
        │       ┌────────────────────────────────────────────────────────┐
        │       │ Current Advance Deposit Collected:           $2,500.00 │
        │       │ Current Cumulative Running Bill:             $1,940.00 │
        │       │ New Pharmacy Order Total:                       $85.00 │
        │       ├────────────────────────────────────────────────────────┤
        │       │ Projected Running Total:                     $2,025.00 │
        │       │ Utilization of Deposit:                          81.0% │
        │       └────────────────────────────────────────────────────────┘
        │       *Alert: >80% threshold reached ──► Automated notification sent to
        │        Ward Coordinator & Billing Desk to request advance top-up*
        │
        ▼ (IPD Pharmacist picks unit doses & clicks "Issue to Ward")
═══════════════════════════════════════════════════════════════════════
                 ATOMIC IPD RUNNING BILL TRANSACTION
═══════════════════════════════════════════════════════════════════════
  1. Zero cash collected from ward nurse, patient, or attendants
  2. Line items atomically appended to active Inpatient Admission Folio
     (`category: IPD`, `source: Pharmacy`, timestamped with dispensing batch ID)
  3. Real-time Inpatient Census financial ledger updated
  4. Central pharmacy store batch inventory decremented
  5. Inpatient MAR (Medication Administration Record) updated:
     "AWAITING_SUPPLY" ──► "READY_TO_ADMINISTER"
  6. Consolidated settlement deferred until final patient discharge
═══════════════════════════════════════════════════════════════════════
```
