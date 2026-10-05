# North Hospital HMS — Billing Department 8-Phase Implementation Plan

**Document Version:** 1.0  
**Status:** Ready for Execution  
**Architecture Reference:** [`docs/BILLING_REQUIREMENTS.md`](file:///d:/North-Hospital/docs/BILLING_REQUIREMENTS.md), [`docs/hms-design-bible.md`](file:///d:/North-Hospital/docs/hms-design-bible.md)  
**Build Philosophy:** Patient-journey-first, separation of duties, immutable fiscal auditability, high-density Claude design system.

---

## Executive Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE 8 BILLING IMPLEMENTATION PHASES                                   │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ PHASE 1         │ PHASE 2         │ PHASE 3         │ PHASE 4         │ PHASE 5                 │
│ Database Schema │ Tariff Master   │ Frontline Cashier│ Departmental    │ IPD Running Ledger      │
│ & Migrations    │ & Packages      │ Counter & POS   │ Hard Gates      │ & Discharge Clearance   │
│ Invoices, Shifts│ Service Rates,  │ Multi-Tender,   │ Lab Sample Gate,│ Bed Accrual, Ledger,    │
│ Deposits, Refund│ Corporate & TPA │ Receipts A4/80mm│ Pharmacy Link   │ QR Clearance Pass       │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ PHASE 6         │ PHASE 7         │ PHASE 8                                                     │
│ Supervisor Desk │ Billing Admin   │ Verification, End-to-End Tests & Seed Data                  │
│ Approvals, Shift│ Executive Master│ Full Automated Test Suite (50+ tests), 4 Demo Personas,     │
│ Close, Refunds  │ Rosters, Reports│ Route Container & Menu Wiring, Production Verification      │
└─────────────────┴─────────────────┴─────────────────────────────────────────────────────────────┘
```

---

# PHASE 1: Database Models, Migrations & Serializers

### Primary Objectives
Establish the persistent relational data model for the Billing Department in Django ORM and Django REST Framework serializers according to `BILLING_REQUIREMENTS.md`.

### Backend Tasks
1. **Extend Existing Billing Models (`backend/apps/billing/models.py`):**
   - **`Invoice`**:
     - Fields: `invoice_number` (`INV-YYYYMM-XXXXX`, unique, indexed), `patient` (FK), `encounter_type` (`OPD`, `IPD`, `EMERGENCY`, `DAYCARE`), `status` (`DRAFT`, `PENDING`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`, `REFUNDED`), `total_gross`, `discount_amount`, `discount_reason`, `discount_approved_by` (FK User nullable), `tax_amount`, `net_amount`, `paid_amount`, `balance_amount`, `advance_deducted`, `settlement_mode`, `counter` (FK `BillingCounter` nullable), `cashier` (FK User nullable), `token_slip_number`, `tpa_claim_reference`, `corporate_reference`, `cancellation_reason`, `cancelled_by` (FK User nullable), `created_at`, `updated_at`.
   - **`InvoiceItem`**:
     - Fields: `invoice` (FK), `department` (`OPD`, `LAB`, `PHARMACY`, `IPD`, `OT`, `RADIOLOGY`, `GENERAL`), `service_code`, `service_name`, `unit_price`, `quantity`, `discount_percent`, `discount_amount`, `tax_rate`, `tax_amount`, `net_price`, `source_reference_id` (UUID nullable, tracking consultation, lab order, or pharmacy dispense order).
   - **`Payment`**:
     - Fields: `payment_number` (`RCP-YYYYMM-XXXXX`, unique, indexed), `invoice` (FK), `patient` (FK), `amount_paid`, `tender_mode` (`CASH`, `CARD`, `UPI`, `NETBANKING`, `CHEQUE`, `DEPOSIT_DEDUCTION`, `INSURANCE_TPA`, `CORPORATE_CREDIT`), `transaction_reference`, `card_network`, `card_last_four`, `auth_code`, `upi_vpa`, `cheque_number`, `cheque_bank`, `payment_status` (`SUCCESS`, `FAILED`, `REFUNDED`), `counter` (FK `BillingCounter` nullable), `cashier` (FK User nullable), `created_at`.
2. **Implement New Billing Models:**
   - **`BillingCounter`**:
     - Fields: `code` (e.g. `CNT-01`), `name` (`Counter 1 - Main Lobby OPD`), `station_location` (`OPD_LOBBY`, `EMERGENCY`, `IPD_DESK`, `DIAGNOSTICS`), `is_active`, `ip_terminal_binding`, `created_at`.
   - **`CounterShift`**:
     - Fields: `counter` (FK `BillingCounter`), `cashier` (FK User), `opening_float` (Decimal), `opening_time` (DateTimeField), `closing_time` (DateTimeField nullable), `status` (`OPEN`, `PENDING_APPROVAL`, `CLOSED`), `denominations_submitted` (JSONField: count of ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes), `card_settlement_batch_total` (Decimal), `upi_settlement_total` (Decimal), `physical_cash_count` (Decimal nullable), `system_expected_cash` (Decimal nullable), `cash_variance` (Decimal default 0.00), `variance_note` (TextField blank), `supervisor_sign_off_by` (FK User nullable), `supervisor_signed_at` (DateTimeField nullable).
   - **`PatientDeposit`**:
     - Fields: `deposit_number` (`DEP-YYYYMM-XXXXX`, unique, indexed), `patient` (FK), `ipd_admission` (FK `Admission` nullable), `deposit_amount`, `utilized_amount`, `available_balance`, `tender_mode`, `transaction_reference`, `status` (`ACTIVE`, `PARTIALLY_UTILIZED`, `EXHAUSTED`, `REFUNDED`), `cashier` (FK User), `receipt_printed`, `created_at`.
   - **`RefundRequest`**:
     - Fields: `refund_number` (`RFD-YYYYMM-XXXXX`, unique, indexed), `invoice` (FK), `payment` (FK `Payment` nullable), `patient` (FK), `requested_amount`, `reason`, `clinical_justification`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `DISBURSED`), `initiated_by` (FK User), `approved_by` (FK User nullable), `approved_at` (DateTimeField nullable), `disbursed_at` (DateTimeField nullable), `disbursed_tender` (CharField nullable), `rejection_reason` (TextField blank), `credit_note_number` (CharField blank, indexed).
   - **`TariffMaster`**:
     - Fields: `code` (e.g. `CONS-GEN-01`), `name`, `department` (`OPD`, `LAB`, `PHARMACY`, `IPD`, `OT`, `RADIOLOGY`, `GENERAL`), `base_price`, `emergency_markup_percent`, `gst_rate`, `is_active`, `created_at`.
   - **`ServicePackage`**:
     - Fields: `code` (e.g. `PKG-DELIVERY-01`), `name`, `package_price`, `department`, `inclusions_description` (TextField), `exclusions_description` (TextField), `validity_days`, `is_active`.
   - **`CorporateAccount` & `TPAPolicy`**:
     - Fields: `code`, `name`, `account_type` (`CORPORATE`, `TPA_INSURANCE`), `credit_limit`, `utilized_credit`, `co_pay_percentage`, `deductible_amount`, `room_rent_ceiling`, `valid_until`, `is_active`.
   - **`FinancialDischargeClearance`**:
     - Fields: `admission` (FK `Admission`, unique), `final_invoice` (FK `Invoice`), `clearance_status` (`PENDING_SETTLEMENT`, `DISPUTED`, `CLEARED`), `net_payable`, `deposit_applied`, `insurance_covered`, `patient_paid`, `cleared_by` (FK User nullable), `cleared_at` (DateTimeField nullable), `qr_verification_token` (CharField, unique), `notes`.
3. **Database Migrations:**
   - Run `python manage.py makemigrations billing && python manage.py migrate billing`.
4. **Serializers (`backend/apps/billing/serializers.py`):**
   - Read & write serializers with validation rules (deposit balances, non-negative amounts, tender validations, shift status).

### Validation & Exit Criteria
- `python manage.py makemigrations --check` detects zero unapplied schema changes.
- Models instantiate cleanly with foreign key relational integrity.

---

# PHASE 2: Tariff Master, Service Packages & Corporate/TPA Pricing Engine [COMPLETED]

### Primary Objectives
Implement dynamic pricing calculation, standard hospital price catalog, composite surgery packages, and contracted insurer schedules.

### Backend Tasks
1. **Pricing Calculation Service (`backend/apps/billing/services.py` - `TariffPricingService`):**
   - Calculate effective rate for any service based on encounter type (`OPD`, `IPD`, `EMERGENCY`), patient category (`GENERAL`, `CORPORATE`, `TPA`, `STAFF`), and emergency time markups (e.g. 20% night surcharge).
   - Dynamic quotation calculator: items breakdown, taxes, gross total, and patient vs corporate co-pay responsibility split.
   - Enforce package coverage: automatically determine if an ordered service is covered by an active inpatient package or must be billed separately.
2. **REST Endpoints (`backend/apps/billing/urls.py`):**
   - `GET /api/v1/billing/tariffs/` & `POST /api/v1/billing/tariffs/`: Master service catalog.
   - `GET /api/v1/billing/packages/` & `POST /api/v1/billing/packages/`: Surgery packages.
   - `GET /api/v1/billing/corporate-accounts/` & `POST /api/v1/billing/corporate-accounts/`: Corporate agreements and TPA rates.
   - `POST /api/v1/billing/pricing/calculate-quote/`: Dynamic pricing calculator.

### Frontend Tasks
1. **Tariff & Package Master Views (`frontend/src/pages/billing/admin/`):**
   - `TariffMasterTab.tsx`: Tabular service catalog with category filter pills (`All`, `OPD`, `Lab`, `IPD`, `OT`, `Radiology`, etc.), search, base rate, GST slab, emergency markup, and create/edit modal.
   - `PackageManagementTab.tsx`: Composite surgery & maternity procedure packages, inclusions/exclusions tags, validity days, and creation modal.
   - `CorporateTpaTab.tsx`: Corporate credit agreements & TPA insurance partners, credit utilization meters, co-pay tags, and embedded interactive quote simulator.
   - `PricingQuotationSimulator.tsx`: Live pricing simulation testing emergency rates, GST, and corporate co-pay splits.
2. **Billing Client (`frontend/src/services/billingService.ts`):**
   - Full typed client with endpoints for tariffs, packages, corporate accounts, quotes, invoices, and payments.

### Validation & Exit Criteria
- `python manage.py test apps.billing`: 10/10 tests passing with 0 failures, 0 errors.
- `npm run build`: 0 TypeScript or Vite build errors.
   - Package manager card list with itemized inclusions/exclusions drawer.

### Validation & Exit Criteria
- Quotation calculator returns accurate pricing with GST and category discounts applied.

---

# PHASE 3: Frontline Cashier Workspace, Counter Management & Multi-Tender POS

### Primary Objectives
Build the high-velocity operational POS workspace for Cashiers/Billing Executives (`/billing` & `/billing/cashier`), supporting multi-tender split payments, fast patient lookup, thermal 80mm and A4 GST receipt printing, and cashier float shifts.

### Backend Tasks
1. **Billing Core Service (`backend/apps/billing/services.py` - `BillingCoreService`):**
   - `create_invoice_from_charges()`: Consolidate queued charges into a formal invoice.
   - `process_multi_tender_payment()`: Split payments across Cash, Card, UPI, Cheque, and Deposit deductions in an atomic database transaction.
   - `generate_receipt()`: Issue numbered sequential receipt tokens.
2. **Counter Shift Service (`CounterClosingService`):**
   - `open_shift()`: Register active cashier, counter terminal, and opening cash float.
   - `get_active_shift_summary()`: Live cash in drawer, electronic payments, and transaction tally.
3. **Endpoints:**
   - `GET /api/v1/billing/cashier/queue/`: Pending unbilled charges stream.
   - `POST /api/v1/billing/invoices/`: Create invoice.
   - `POST /api/v1/billing/payments/`: Record multi-tender payment.
   - `POST /api/v1/billing/shifts/open/`: Open shift.
   - `GET /api/v1/billing/shifts/current/`: Current shift status.

### Frontend Tasks
1. **Cashier Workspace (`frontend/src/pages/billing/cashier/CashierBillingWorkspace.tsx`):**
   - Top banner: Counter station tag (`Counter 1 · Main OPD Lobby`), Active Shift tag (`Shift Open · Float: ₹5,000`), Clock, and Current Drawer Cash summary.
   - 5 KPI Cards: Invoices Today, Collections Today, Pending Bills, Refund Requests, Patients Served.
   - Unbilled Queue Table: UHID, Patient Name, Encounter, Department, Items, Gross Amount, Elapsed Time, Action (`Bill Now`).
2. **Payment Collection Slide-over (`PaymentCollectionDrawer.tsx`):**
   - Multi-tender split bar (Visual distribution across Cash, Card, UPI, Deposit).
   - Tender breakdown inputs:
     - Cash input with change return calculator.
     - Card input with terminal TID & Authorization Code.
     - UPI input with dynamic QR display and transaction UTR field.
     - Advance deposit adjustment toggle with available balance check.
3. **Receipt Generator Component (`ReceiptModal.tsx`):**
   - Toggle between **80mm Thermal Receipt** (compact slip with barcode token) and **Full A4 GST Tax Invoice** (detailed itemization, HSN/SAC codes, hospital registration, authorized signature block).
   - Print action, PDF download, and WhatsApp/Email delivery confirmation trigger.

### Validation & Exit Criteria
- Cashier can open shift, select an unbilled patient, collect split payment (e.g. ₹1,000 Cash + ₹1,500 UPI), and generate both 80mm thermal and A4 receipts with immediate ledger update.

---

# PHASE 4: Departmental Billing Integrations & Hard Gates

### Primary Objectives
Enforce cross-departmental financial invariants: OPD consultation fees, Laboratory sample collection hard gate, and Pharmacy counter vs central settlement linking.

### Backend Tasks
1. **Clinical OPD Consultation Integration:**
   - Consultation check-in automatically creates a queued billing line item.
   - Once invoice is marked `PAID`, consultation status advances to `READY_FOR_CONSULTATION`.
2. **Diagnostic Laboratory Hard Gate:**
   - Lab test orders generate `UNBILLED_DIAGNOSTIC` invoice items.
   - Sample collection gate check: LIS phlebotomy endpoint checks `InvoiceItem.status == 'PAID'` (or authorized TPA/IPD admission) before permitting sample barcode printing.
3. **Pharmacy Integration:**
   - Link Pharmacy Dispense Order settlement mode:
     - `PAY_AT_RECEPTION`: Prescriptions route to central billing queue. Cashier settles invoice, updating pharmacy dispense order to `FULFILLED`.

### Frontend Tasks
1. **Departmental Charge Ingestion Views:**
   - Filterable tabs in Cashier Queue: `[All]` | `[OPD Consultations]` | `[Laboratory]` | `[Pharmacy]` | `[IPD & Daycare]`.
   - Visual badges distinguishing stat orders, doctor chamber numbers, and lab requisition IDs.

### Validation & Exit Criteria
- Laboratory Phlebotomist cannot print sample label or draw blood for unbilled outpatient until cashier payment completes.

---

# PHASE 5: Inpatient (IPD) Running Ledger & Financial Discharge Clearance Gate

### Primary Objectives
Build continuous IPD financial tracking: admission deposit capture, midnight bed and nursing tariff accruals, running ledger auditing, interim deposit demand letters, and the mandatory **Financial Discharge Clearance Gate**.

### Backend Tasks
1. **Inpatient Running Ledger Service (`IPDRunningLedgerService`):**
   - `record_admission_deposit()`: Collect statutory security deposit for General/ICU/Suite beds.
   - `accrue_daily_room_charges()`: Daily cron logic accruing bed tariff, resident doctor rounds, and nursing charges every 24 hours.
   - `append_ward_charge()`: Real-time logging of pharmacy ward supplies, OT surgery slabs, and bedside procedures.
   - `check_deposit_threshold()`: Evaluate running bill vs deposit (flag interim deposit request if > 80%).
   - `generate_final_discharge_bill()`: Deduct deposits and TPA pre-auth, compute net balance, and release QR-coded `FinancialDischargeClearance`.
2. **Endpoints:**
   - `GET /api/v1/billing/ipd/running-ledger/<uuid:admission_id>/`: Itemized ledger.
   - `POST /api/v1/billing/deposits/`: Record patient deposit.
   - `POST /api/v1/billing/ipd/discharge-clearance/`: Settle final bill and grant clearance.
   - `GET /api/v1/billing/ipd/verify-clearance/<str:token>/`: Nursing & Security gate verification.

### Frontend Tasks
1. **IPD Billing Workspace (`frontend/src/pages/billing/ipd/`):**
   - Running ledger view with grouped accordions: Room & Nursing, Doctor Rounds, Pharmacy Ward Requisitions, Diagnostics, OT & Procedures.
   - Deposit vs Accrual Meter (Visual progress gauge showing deposit utilization).
   - Financial Discharge Clearance Modal: Generates printable QR-coded Exit Pass.

### Validation & Exit Criteria
- Medically discharged inpatient cannot be marked discharged by nursing staff or permitted exit by security without a verified `FinancialDischargeClearance` pass.

---

# PHASE 6: Billing Supervisor Workspace, Approvals & Counter Reconciliation

### Primary Objectives
Implement the Supervisor command center (`/billing/supervisor`): discount authorization, refund investigation, bill voiding/cancellation, and shift closing reconciliation with physical cash denomination counting.

### Backend Tasks
1. **Supervisor Governance Service (`SupervisorGovernanceService`):**
   - `review_discount_request()`: Approve/reject cashier discounts exceeding policy ceiling (> 5%).
   - `review_refund_request()`: Verify clinical reasons, verify returned medicines or cancelled lab tests, and authorize fund disbursal or credit note issuance.
   - `void_invoice()`: Cancel erroneous invoices with mandatory audit justification and credit memo creation.
   - `reconcile_counter_shift()`: Compare cashier physical denomination count against system registered collections, record cash variances, and sign off shift closing.
2. **Endpoints:**
   - `GET /api/v1/billing/supervisor/pending-approvals/`
   - `POST /api/v1/billing/discounts/<uuid:pk>/review/`
   - `POST /api/v1/billing/refunds/<uuid:pk>/review/`
   - `POST /api/v1/billing/invoices/<uuid:pk>/void/`
   - `POST /api/v1/billing/shifts/<uuid:pk>/close-and-reconcile/`

### Frontend Tasks
1. **Supervisor Dashboard (`frontend/src/pages/billing/supervisor/BillingSupervisorWorkspace.tsx`):**
   - 5 KPI Cards: Pending Approvals, Pending Refunds, Counter Collections, Outstanding Payments, Counters Active.
   - Sub-tabs: `[Approvals Queue]` | `[Refund Management]` | `[Counter Closings]` | `[Credit Accounts]` | `[Audit Trail]`.
2. **Counter Closing Reconciliation Modal (`ShiftReconciliationModal.tsx`):**
   - Physical note counter grid (Inputs for ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes with live total).
   - Card EDC settlement batch entry & UPI confirmation.
   - System auto-variance calculation (Green if exact match, Red if discrepancy).
   - Supervisor sign-off signature block and bank safe deposit slip export.

### Validation & Exit Criteria
- Cashier shift closing requires note-by-note count; supervisor verifies physical handover, records variance, and locks shift from further edits.

---

# PHASE 7: Billing Admin Workspace, Tariff Management & Revenue Analytics

### Primary Objectives
Deliver the executive master management suite (`/department/billing` or `/billing/admin`) for the Head of Billing: enterprise tariff master, corporate contract schedules, counter and staff duty rosters, and financial audit reports.

### Backend Tasks
1. **Billing Admin Service (`BillingAdminService`):**
   - `get_executive_revenue_metrics()`: Macro hospital revenue, departmental breakdown, tender distribution, and debt aging.
   - `manage_billing_counters()`: CRUD on physical counters and station hardware.
   - `get_staff_duty_roster()` & `update_counter_roster()`: Assign cashiers and supervisors to Morning/Evening/Night shifts.
   - `get_financial_tax_reports()`: GST tax liability summary, collections by mode, and cashier productivity metrics.
2. **Endpoints:**
   - `GET /api/v1/billing/admin/dashboard/`
   - `GET /api/v1/billing/admin/counters/` & `POST /api/v1/billing/admin/counters/`
   - `GET /api/v1/billing/admin/roster/` & `POST /api/v1/billing/admin/roster/`
   - `GET /api/v1/billing/admin/reports/revenue/`
   - `GET /api/v1/billing/admin/reports/tax-gst/`
   - `GET /api/v1/billing/admin/reports/aging/`

### Frontend Tasks
1. **Admin Workspace (`frontend/src/pages/billing/admin/BillingAdminWorkspace.tsx`):**
   - Integrated into `DepartmentWorkspaceContainer` for `deptId === 'billing'`.
   - Left Navigation: `[Overview]`, `[Tariff Master]`, `[Package Manager]`, `[Corporate & TPA]`, `[Counters Directory]`, `[Staff Rostering]`, `[Revenue Reports]`, `[Settings]`.
   - 5 KPI Cards: Revenue Today, Revenue This Month, Outstanding Amount, Insurance Claims, Corporate Receivables.
   - Interactive charts: Hourly collections bar chart, revenue by department donut, collection by tender breakdown.

### Validation & Exit Criteria
- Billing Admin has full oversight of hospital revenue cycle, price lists, rosters, and compliance reports with zero direct clinical mutation capabilities.

---

# PHASE 8: Verification, Test Suite, Demo Personas & Production Build

### Primary Objectives
Perform end-to-end integration testing, seed comprehensive demo billing data, establish 50+ automated unit and integration tests, wire all role-based routing, and verify production build.

### Tasks
1. **Seed Script (`backend/apps/billing/management/commands/seed_billing_data.py`):**
   - 6 Billing Counters (`CNT-01` to `CNT-06`).
   - 4 Demo Users with credentials:
     - **Ritu Verma** (`EMP-CASH-01` / `ritu.verma@northhospital.com`, password `Password123!`) — Senior OPD Cashier.
     - **David Miller** (`EMP-BILL-TPA` / `david.miller@northhospital.com`, password `Password123!`) — IPD & Insurance Billing Officer.
     - **Vikramaditya Rao** (`EMP-BILL-SUP` / `vikram.rao@northhospital.com`, password `Password123!`) — Billing Supervisor.
     - **Anita Desai** (`EMP-BILL-ADM` / `anita.desai@northhospital.com`, password `Password123!`) — Head of Billing & Revenue Cycle.
   - 25+ Tariff items across all departments, 3 bundled packages, 2 corporate agreements (ONGC, IOCL), 2 TPA plans (Star Health, HDFC Ergo).
   - Sample queued charges, active shifts, running IPD ledgers, and deposits.
2. **Automated Backend Tests (`backend/apps/billing/tests.py`):**
   - Test suite verifying: multi-tender payment calculations, advance deposit utilization, discount approval escalation, laboratory hard gate clearance, IPD discharge clearance token validation, and shift closing variance reconciliation.
3. **Frontend Routing & Navigation:**
   - Register routes in `frontend/src/App.tsx`:
     - `/billing` & `/billing/cashier` → Cashier Workspace
     - `/billing/supervisor/*` → Supervisor Workspace
     - `/department/billing/*` & `/billing/admin` → Admin Master Workspace
   - Update `authCatalog.ts` and `hospitalStaffStore.ts` with the 4 demo personas.
4. **Validation:**
   - Execute `python manage.py test apps.billing`.
   - Execute `npm run build` in `frontend/` ensuring 0 errors.

---

## Complete Phase Summary Table

| Phase | Core Focus | Primary Actor | Key Deliverables | Target Status |
|:---:|:---|:---|:---|:---:|
| **Phase 1** | Database Models & Schema | Database / Backend | Invoices, Items, Payments, Counters, Shifts, Deposits, Refunds, Tariffs | **READY** |
| **Phase 2** | Tariff Master & Packages | Billing Admin / Backend | Dynamic Pricing Engine, Package Bundles, Corporate & TPA Schedules | **QUEUED** |
| **Phase 3** | Frontline Cashier POS | Cashier / Billing Executive | Operational Counter Workspace, Split Tenders, 80mm & A4 Receipts | **QUEUED** |
| **Phase 4** | Departmental Hard Gates | Inter-Departmental | OPD Fee Queue, Lab Sample Collection Hard Gate, Pharmacy Links | **QUEUED** |
| **Phase 5** | IPD Running Bill & Gate | IPD & Insurance Officer | Midnight Room Accrual, Running Ledger, QR Financial Discharge Pass | **QUEUED** |
| **Phase 6** | Billing Supervisor Desk | Billing Supervisor | Approvals Queue, Refund Authorization, Shift Closing Reconciliation | **QUEUED** |
| **Phase 7** | Billing Admin Master | Billing Admin | Executive Analytics, Rostering, Counters Directory, GST Reports | **QUEUED** |
| **Phase 8** | Integration & Verification | All Roles / Full Stack | Seed Data, 4 Demo Personas, 50+ Unit Tests, Production Build | **QUEUED** |
