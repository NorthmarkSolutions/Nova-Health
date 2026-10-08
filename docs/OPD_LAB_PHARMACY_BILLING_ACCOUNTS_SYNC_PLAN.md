# North Hospital HMS — OPD, Laboratory & Pharmacy Integration Blueprint
## End-to-End Tariff Synchronization, Frontdesk Cashier Billing & Accounts Department Ledger Bridge

> **Scope Restriction:** Focuses strictly on **OPD (Outpatient Consultations)**, **Laboratory (Pathology & Diagnostics)**, and **Pharmacy (Formulary & Dispensary)**.  
> *Radiology, IPD/Wards, and OT are excluded from this implementation scope.*

---

## 1. Executive Summary & Problem Statement

In a tertiary healthcare enterprise, the Front Desk (Cashier) and Accounts & Finance teams depend on instant, automated synchronization with clinical departments:

1. **Department Tariff Reflection**: When doctors set consultation fees, lab directors adjust diagnostic test prices, or chief pharmacists configure medicine MRPs/unit prices, these rates must instantly reflect at the **Front Desk Cashier POS** without manual re-entry.
2. **Unified Frontdesk Billing**: When a patient arrives at the billing counter (walk-in or referred), the cashier must see all unbilled charges from OPD, Lab, and Pharmacy in a unified queue, or search and bill any service across these three departments with guaranteed price integrity.
3. **Instant Revenue Handover to Accounts**: Once a bill is settled (via Cash, Card, UPI, or Corporate credit), the transaction must automatically generate balanced, double-entry General Ledger (GL) journal entries segmented by department (`4110 OPD`, `4120 LAB`, `4140 PHARMACY`), providing real-time visibility to the accounting team.

---

## 2. Architecture & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CLINICAL & DIAGNOSTIC DEPARTMENTS                               │
│                                                                                        │
│   ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────┐   │
│   │   OPD CONSULTATION   │  │    DIAGNOSTIC LAB    │  │     PHARMACY FORMULARY     │   │
│   │ DoctorProfile: fee   │  │ LabTest: price       │  │ PharmacyMedicine: unit_price│  │
│   │ Appointment check-in │  │ LabOrder creation    │  │ Dispense order creation    │   │
│   └──────────┬───────────┘  └──────────┬───────────┘  └─────────────┬──────────────┘   │
└──────────────┼─────────────────────────┼────────────────────────────┼──────────────────┘
               │                         │                            │
               │ (1a. Tariff Sync)       │ (1b. Tariff Sync)          │ (1c. Tariff Sync)
               ▼                         ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               CENTRAL TARIFF MASTER & STAGED CHARGES BRIDGE (apps/billing)             │
│                                                                                        │
│   • TariffMaster: Unified catalog [code, name, department, base_price, gst_rate]      │
│   • BillableChargeItem: Staged PENDING charges tied to Patient UHID                    │
│   • DepartmentChargeEvent: Traceability linking clinical orders to billing items       │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         │ (2. Live Queue & Universal Catalog Search)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               FRONTLINE CASHIER COUNTER / FRONT DESK POS (Cashier Workspace)           │
│                                                                                        │
│   • Auto-loads Patient Pending Items: [Doctor Fee] + [Lab Tests] + [Prescription]      │
│   • Walk-in Catalog Selector: Search & add OPD, Lab, or Pharmacy items on-the-fly      │
│   • Multi-Tender Settlement: Cash / UPI QR / Card / Deposit split                      │
│   • Thermal 80mm Slip / A4 Legal Tax Invoice issuance                                  │
└──────────────────────┬───────────────────────────────────────────┬─────────────────────┘
                       │ (3a. Clinical Gate Unlocks)               │ (3b. Real-time GL Sync)
                       ▼                                           ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│           CLINICAL CLEARANCE GATES           │ │      ACCOUNTS & FINANCE DEPARTMENT    │
│                                              │ │                                       │
│  • OPD: Token unblocked for Doctor entry     │ │  • Real-Time General Ledger Posting:  │
│  • Lab: Phlebotomist unblocked for blood draw│ │    Dr 1110 Cash / 1120 Card / 1130 UPI│
│  • Pharmacy: Dispenser releases medicines    │ │    Cr 4110 OPD Consultation Revenue   │
│                                              │ │    Cr 4120 Diagnostic Lab Revenue     │
│                                              │ │    Cr 4140 Pharmacy Sales Revenue     │
│                                              │ │    Cr 2410 GST Output Payable         │
└──────────────────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 3. Detailed Phase Breakdown

### PHASE 1: Real-Time Department Tariff Synchronization Engine
**Objective:** Maintain `TariffMaster` as the central price book, automatically synchronized whenever OPD, Lab, or Pharmacy prices are created or updated.

#### 1.1 OPD Tariff Synchronization (`apps/accounts` & `apps/appointments`)
- **Source Model:** `DoctorProfile.consultation_fee`
- **Sync Mechanism:**
  - Create a Django post-save signal or domain service hook on `DoctorProfile`.
  - When a doctor is created or their `consultation_fee` changes:
    - Auto-create/update a `TariffMaster` record:
      - `code = f"DOC-{doctor.id[:8].upper()}"` (and alias by specialty e.g. `CONS-{SPECIALTY}`)
      - `name = f"Consultation - Dr. {doctor.user.get_full_name()}"`
      - `department = 'OPD'`
      - `base_price = doctor.consultation_fee`
      - `gst_rate = Decimal('0.00')` (Medical consultations are GST exempt)
      - `owner_department = 'OPD'`
- **Order Generation Hook:**
  - When an appointment is created or checked in, call `DepartmentChargeIntegrationService.emit_opd_consultation_charge(appointment)` to stage a `BillableChargeItem` in `PENDING` status.

#### 1.2 Laboratory Tariff Synchronization (`apps/lab`)
- **Source Model:** `LabTest.price`, `LabTest.tpa_price`
- **Sync Mechanism:**
  - Create a post-save signal or hook in `LabTestViewSet` / `LabTest` model.
  - When a test price is updated by the Laboratory team:
    - Update/create `TariffMaster`:
      - `code = test.test_code`
      - `name = test.name`
      - `department = 'LAB'`
      - `base_price = test.price`
      - `gst_rate = Decimal('0.00')` (Diagnostic tests under healthcare exemption)
      - `owner_department = 'LAB'`
- **Order Generation & Clinical Hard Gate:**
  - When a doctor orders lab tests, `DepartmentChargeIntegrationService.emit_lab_test_charges(lab_order)` stages pending charges.
  - `is_lab_sample_collection_allowed` prevents sample collection until the charge is paid at the cashier counter.

#### 1.3 Pharmacy Tariff Synchronization (`apps/pharmacy`)
- **Source Model:** `PharmacyMedicine.unit_price`, `cost_price`
- **Sync Mechanism:**
  - In `PharmacyMedicineViewSet` and `PharmacyMedicinePricingView`, trigger `TariffMaster` synchronization on price updates:
    - `code = medicine.item_code`
    - `name = f"{medicine.name} ({medicine.strength or ''})"`
    - `department = 'PHARMACY'`
    - `base_price = medicine.unit_price`
    - `gst_rate = Decimal('12.00')` (or item-specific medicine GST slab)
    - `owner_department = 'PHARMACY'`
- **Order Generation & Clinical Hard Gate:**
  - When an OPD prescription is routed to `PAY_AT_RECEPTION`, `emit_pharmacy_dispense_charge` stages the prescription items for cashier checkout.
  - `check_clinical_clearance('PHARMACY_MEDICINE_RELEASE')` prevents drug release until the cashier invoice is settled.

---

### PHASE 2: Frontdesk Cashier Universal Department Catalog & Staging Queue
**Objective:** Give frontdesk cashiers seamless access to live patient charges and an instant multi-department catalog search.

#### 2.1 Live Patient Staging Queue
- The cashier enters the patient's UHID or token number:
  - Fetches all unbilled `BillableChargeItem` rows where `status = 'PENDING'` across OPD, Lab, and Pharmacy.
  - Groups items clearly by source:
    - 🩺 **OPD Consultation**: Doctor name, specialty fee.
    - 🧪 **Diagnostic Lab**: Tests ordered, urgency (Routine/STAT).
    - 💊 **Pharmacy**: Dispense order number, prescribed medicines list.

#### 2.2 Universal Walk-In Department Catalog Search
- Cashiers frequently handle walk-in patients (e.g., patient wants a walk-in CBC blood test or general consultation without pre-booking):
  - Add a fast search modal in `BillingExecutiveWorkspace`:
    - Filter tabs: `[All Departments]` | `[Doctor Consultations]` | `[Lab Tests]` | `[Pharmacy Formulary]`.
    - Live search query matches code or name.
    - Displays live base price, GST rate, and department tag.
  - Clicking "Add to Bill" immediately stages a `BillableChargeItem` priced strictly from `TariffMaster`.

#### 2.3 Consolidated Multi-Tender Checkout
- Cashier selects all pending items (OPD + Lab + Pharmacy).
- System computes:
  - `Gross Subtotal`
  - `Discounts` (guarded: cashiers can apply up to 5%; > 5% requires supervisor approval)
  - `Tax / GST`
  - `Net Payable`
- Supports split tenders: Cash, UPI QR, Credit/Debit Card, Advance Deposit deduction.
- On payment confirmation:
  - Generates immutable `Invoice` and `BillingReceipt`.
  - Fires `CashierWorkspaceService.emit_clinical_unlocks()` to immediately unblock the phlebotomist (Lab) and pharmacist (Pharmacy).

---

### PHASE 3: Real-Time Cashier Settlement to Accounts Department General Ledger (GL) Bridge
**Objective:** Automatically translate settled patient invoices into departmentalized accounting journal entries for the Accounts & Finance team.

#### 3.1 Departmentalized Chart of Accounts (COA)
Map hospital billing operations to standard double-entry accounting accounts:

| Account Code | Account Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **1110** | Cash in Hand / Counter Drawer | Asset (Debit) | Physical cash collected at counters |
| **1120** | Card Settlement Receivable | Asset (Debit) | POS card machine terminal batches |
| **1130** | UPI / Payment Gateway Clearing | Asset (Debit) | Instant UPI QR collections |
| **1300** | Patient Accounts Receivable | Asset (Debit) | Billed amounts awaiting settlement |
| **2310** | Patient Advance Deposits | Liability (Debit/Credit) | Patient deposit buffer utilization |
| **2410** | Output GST Payable | Liability (Credit) | GST collected on pharmacy / taxable items |
| **4110** | OPD Consultation Revenue | Revenue (Credit) | Revenue earned from doctor visits |
| **4120** | Diagnostic Laboratory Revenue | Revenue (Credit) | Revenue earned from pathology tests |
| **4140** | Pharmacy Drug Sales Revenue | Revenue (Credit) | Revenue earned from medicine sales |

#### 3.2 Real-Time General Ledger Posting Engine
- Create a dedicated model and service:
  - `GeneralLedgerJournalEntry`: Stores Journal Reference (`JV-YYYYMM-NNNNN`), timestamp, invoice reference, and balanced status.
  - `GeneralLedgerLineItem`: Account code, account name, debit amount, credit amount, department tag (`OPD`, `LAB`, `PHARMACY`).
- **Trigger Hook**:
  - Attached to `BillingCoreService.process_multi_tender_payment()`:
    1. Cash/Card/UPI is debited to the corresponding tender asset account.
    2. Each invoice line item's subtotal is credited to its specific department revenue account (`4110 OPD`, `4120 LAB`, `4140 PHARMACY`).
    3. Total tax is credited to `2410 Output GST Payable`.
    4. Mathematical validation verifies `Total Debits == Total Credits`.

#### 3.3 Accounts Department Real-Time Feed
- Update `AccountsDepartmentContainer.tsx` and `RevenueAnalyticsScreen.tsx`:
  - **Live Department Breakdown**: Visual tiles showing Today's Revenue by Department (OPD ₹X, Lab ₹Y, Pharmacy ₹Z).
  - **Counter Collection Stream**: Real-time ticker of cash drawer totals, card batches, and UPI receipts ready for daily bank vault deposit.
  - **Audit Reconciliation**: Instant cross-verification between cashier shift drawer tallies and General Ledger accounts.

---

## 4. Implementation Step-by-Step Checklist

### Phase 1: Tariff Synchronization (OPD + Lab + Pharmacy)
- [x] Implement `sync_doctor_tariff(doctor_profile)` in `backend/apps/billing/services.py` and hook it to `DoctorProfile` saves.
- [x] Implement `sync_lab_test_tariff(lab_test)` and connect it to `LabTest` post-save signals.
- [x] Implement `sync_pharmacy_medicine_tariff(medicine)` and connect it to `PharmacyMedicine` saves.
- [x] Add bulk backfill management command `python manage.py sync_department_tariffs --departments=OPD,LAB,PHARMACY` to initialize existing records.

### Phase 2: Frontdesk Cashier Universal Catalog & Staging Queue
- [x] Expose unified catalog search endpoint `GET /api/v1/billing/tariffs/?department=OPD,LAB,PHARMACY&search=...`.
- [x] Build the Universal Catalog Modal in `frontend/src/pages/billing/executive/BillingExecutiveWorkspace.tsx`.
- [x] Ensure patient billing drawer displays OPD, Lab, and Pharmacy items in distinct visually tagged groups.
- [x] Verify clinical gate unlocks trigger upon payment completion.

### Phase 3: Real-Time Accounts General Ledger Bridge
- [x] Define `GeneralLedgerJournalEntry` and `GeneralLedgerLineItem` in `backend/apps/billing/models.py`.
- [x] Implement `post_realtime_invoice_journal(invoice, payment)` in `backend/apps/billing/services.py`.
- [x] Connect journal posting trigger to `process_multi_tender_payment`.
- [x] Update `RevenueAnalyticsScreen.tsx` and `AccountsDepartmentContainer.tsx` to render departmental revenue split cards and real-time ledger entries.
- [x] Add unit and integration tests covering tariff synchronization, cashier counter checkout, and balanced GL posting.
