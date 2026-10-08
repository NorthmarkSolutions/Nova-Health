# North Hospital Clinical Enterprise HMS — Billing Department Implementation Plan

> **Document Version:** 2.0 (11-Phase Enterprise Architecture)  
> **Status:** Approved Blueprint for Sequential Execution  
> **Architecture Authorities:**  
> - [`HMS_BIBLE.md` / `hms-design-bible.md`](file:///d:/North-Hospital/docs/hms-design-bible.md)  
> - [`BILLING_REQUIREMENTS.md`](file:///d:/North-Hospital/BILLING_REQUIREMENTS.md)  
> - [`Billing Administration Architecture`](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html)  
> - [`Billing Executive Workspace v2`](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Executive%20Workspace%20v2.dc.html)  
> - [`Billing Supervisor Workspace`](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Supervisor%20Workspace.dc.html)  
> - [`Billing Admin Workspace v3`](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Admin%20Workspace%20v3.dc.html)  

---

## Core Architectural Invariants

1. **Separation of Operational and Financial Concerns:**  
   Clinical departments (**OPD, Lab, Pharmacy, IPD, OT**) generate billable charge events.  
   The **Billing Department** strictly and exclusively owns tariffs, master pricing, invoice consolidation, payment collections, receipts, deposits, refunds, credit notes, and accounts receivable.
2. **Zero Billing Duplication:**  
   No clinical department may directly instantiate legal tax invoices, record standalone payments, or calculate cashier shift drawer balances.
3. **Immutability of Financial Records:**  
   Every financial state change is reversible only through a new compensating record (refund voucher, credit note), never by editing an existing record.
4. **Separation of Duties (Four-Eyes Principle):**  
   Every approval requires `requester != approver`. Cashiers cannot approve discounts > 5% or disburse refunds without supervisor/admin sign-off.

---

## Architectural Conflicts Identified in the Existing HMS Codebase

Before beginning implementation, our codebase audit identified **7 critical architectural conflicts** where billing or pricing logic is currently duplicated or misplaced in clinical domains:

| # | Conflict Location | Nature of Architectural Conflict | Remediation Required |
|---|---|---|---|
| **1** | [pharmacy/services.py](file:///d:/North-Hospital/backend/apps/pharmacy/services.py#L1270-L1335) | **Pharmacy Direct Invoice & Payment Duplication**: In `process_dispense_settlement`, the Pharmacy department directly instantiates `Invoice.objects.create(...)`, generates its own invoice numbers (`INV-PH-...`), directly creates `Payment.objects.create(...)`, and directly mutates cashier shift totals (`active_shift.cash_collected += total`). | Refactor Pharmacy to emit a `BillableChargeEvent` with dispense items and batch IDs. Billing's `BillingCoreService` must process the settlement and return the invoice/receipt token to Pharmacy. |
| **2** | [lab/models.py](file:///d:/North-Hospital/backend/apps/lab/models.py#L19-L20) & [lab/serializers.py](file:///d:/North-Hospital/backend/apps/lab/serializers.py#L159-L161) | **Lab Isolated Hardcoded Pricing**: `LabTest` stores its own `price` and `tpa_price` decimal fields. Serializers compute prices directly from `obj.test.price`. | Lab must not own prices. `TariffMaster` in `apps.billing` must be the single source of truth for test codes, base prices, GST rates, and TPA rates. Lab tests must map to `TariffMaster.code`. |
| **3** | [lab/views.py](file:///d:/North-Hospital/backend/apps/lab/views.py) | **Missing Sample Collection Hard Gate**: Phlebotomists can collect samples and print vacutainer labels regardless of whether an order is billed or paid. | Implement the **Sample Collection Hard Gate** in `apps.lab`: checking `is_sample_collection_allowed(order_id)` against Billing before sample collection or barcode generation. |
| **4** | [appointments/models.py](file:///d:/North-Hospital/backend/apps/appointments/models.py) | **OPD Check-in Omission of Charge Generation**: Appointments track doctor and status, but checking in a patient does not emit a consultation charge event to Billing. | Hook Appointment check-in / reception token creation to emit a `CONSULTATION_CHARGE` event to Billing's unbilled queue. |
| **5** | [ipd/models.py](file:///d:/North-Hospital/backend/apps/ipd/models.py) | **IPD Lacks Tariff Accrual & Financial Clearance Gate**: `InpatientAdmission` only tracks bed, ward, and status. Room rent, nursing fees, and doctor rounds are not accrued. Discharge can occur without zero-balance clearance. | Create automated daily midnight bed/nursing tariff accrual in Billing and enforce the **Financial Discharge Clearance Gate** (`FinancialDischargeClearance` with QR token) before nursing discharge. |
| **6** | [billing/models.py](file:///d:/North-Hospital/backend/apps/billing/models.py#L120-L165) | **Mixing Unbilled Requests with Fiscal Invoices**: Currently, unbilled items from counters are stored as `Invoice` with status `UNPAID`. An unbilled clinical order is an operational charge event, whereas an `Invoice` is a legal tax document. | Introduce `BillableChargeItem` / `ChargeEvent` to stage unbilled orders across departments. Consolidate them into an immutable `Invoice` only upon cashier review/settlement. |
| **7** | [accounts/models.py](file:///d:/North-Hospital/backend/apps/accounts/models.py#L5-L26) | **Incomplete Billing Role Hierarchy**: Current `RoleType` has basic `CASHIER` and `BILLING_SUPERVISOR`, but lacks `BILLING_MANAGER`, `BILLING_ADMIN`, `INSURANCE_COORDINATOR`, `TREASURY_OFFICER`, and `INTERNAL_AUDITOR`. | Extend `RoleType` and establish granular RBAC permission classes matching the 4-tier Billing Administration Architecture. |

---

## Detailed 11-Phase Implementation Plan

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                BILLING IMPLEMENTATION ROADMAP                                    │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ PHASE 1           │ PHASE 2           │ PHASE 3           │ PHASE 4           │ PHASE 5          │
│ Core Billing      │ Department Charge │ Billing Executive │ Counter Shift &   │ Billing          │
│ Backend           │ Integration       │ & Frontline POS   │ Cash Control      │ Supervisor Desk  │
│ Models, Payments, │ OPD/Lab/Pharm/IPD │ Cashier Desk,     │ Shift Float, Note │ Approvals, Voids,│
│ Deposits, Refunds │ Charge Gateways   │ Multi-Tender Split│ Tally, Variance   │ Counter Mode     │
├───────────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────┤
│ PHASE 6           │ PHASE 7           │ PHASE 8           │ PHASE 9           │ PHASE 10         │
│ Tariffs, Packages │ Billing Admin     │ Insurance / TPA   │ IPD Running Bill  │ Revenue Integrity│
│ & Governance      │ Core Engine       │ & Corporate       │ & Discharge Gate  │ & Governance     │
│ Service Rates, Slabs│ Approval Matrix,│ Cashless Pre-Auth,│ Midnight Accruals,│ Leakage Hunter,  │
│ Surgery Bundles   │ Rosters, Policies │ Claims Dossier    │ QR Clearance Pass │ Risk Signals     │
├───────────────────┴───────────────────┴───────────────────┴───────────────────┴──────────────────┤
│ PHASE 11                                                                                         │
│ Reports, Period Close & Fiscal Audit                                                             │
│ GST Breakdown, AR Aging, Cashier Productivity, Month-End Ledger Lock                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1 — Core Billing Backend

#### 1. Existing Models/Components Reused
- [Patient](file:///d:/North-Hospital/backend/apps/patients/models.py) (`apps.patients.models.Patient`)
- [User](file:///d:/North-Hospital/backend/apps/accounts/models.py) (`apps.accounts.models.User`)
- Base billing models in [backend/apps/billing/models.py](file:///d:/North-Hospital/backend/apps/billing/models.py): `Invoice`, `InvoiceItem`, `Payment`, `PatientDeposit`, `RefundRequest`

#### 2. New Database Models
- `BillableChargeItem`: Operational queue item capturing billable services emitted by clinical departments *prior* to invoice sealing.
  - Fields: `id` (UUID), `patient` (FK), `department` (`OPD`, `LAB`, `PHARMACY`, `IPD`, `OT`, `RADIOLOGY`), `service_code`, `service_name`, `unit_price`, `quantity`, `discount_amount`, `tax_rate`, `tax_amount`, `total_amount`, `source_reference_id` (e.g. consultation ID, lab order ID), `status` (`PENDING`, `INVOICED`, `CANCELLED`), `created_at`.
- `BillingReceipt`: Immutable receipt record generated upon successful payment.
  - Fields: `id` (UUID), `receipt_number` (`RCP-YYYYMM-XXXXX`), `invoice` (FK), `patient` (FK), `payment` (FK), `receipt_type` (`THERMAL_80MM`, `A4_TAX_INVOICE`), `token_slip_number`, `issued_by` (FK User), `qr_verification_token`, `pdf_generated_path`, `created_at`.
- `CreditNote`: Formal credit document for approved refunds and cancellations.
  - Fields: `id` (UUID), `credit_note_number` (`CN-YYYYMM-XXXXX`), `invoice` (FK), `refund_request` (FK nullable), `amount`, `reason`, `issued_by` (FK User), `created_at`.

#### 3. API Endpoints
- `POST /api/v1/billing/invoices/`: Create consolidated invoice from charge items.
- `GET /api/v1/billing/invoices/`: Filterable list of invoices (status, UHID, category, date range).
- `GET /api/v1/billing/invoices/{id}/`: Full invoice itemization, payment records, and balances.
- `POST /api/v1/billing/payments/multi-tender/`: Process multi-tender settlement atomically.
- `GET /api/v1/billing/invoices/{id}/receipt/`: Complete structured receipt payload for 80mm thermal and A4 print.
- `POST /api/v1/billing/deposits/`: Record patient advance deposit with immediate receipt.
- `GET /api/v1/billing/patients/{uhid}/ledger/`: Consolidated patient financial ledger (invoices, payments, deposits, balance).
- `POST /api/v1/billing/refunds/request/`: Initiate refund request with mandatory justification.

#### 4. Services/Business Logic
- `BillingCoreService`:
  - `consolidate_charges_to_invoice(patient_id, charge_ids, cashier, discount_data)`: Validates charges, applies discretionary discount rules, calculates tax, generates `INV-YYYYMM-XXXXX`.
  - `process_multi_tender_settlement(invoice_id, split_payments, cashier, shift)`: Wraps payment execution in `transaction.atomic()` with `select_for_update()`; handles deposit deductions (`PatientDeposit.available_balance -= amount`); marks invoice `PAID` or `PARTIALLY_PAID`.
  - `generate_receipt_voucher(invoice, payment)`: Formats fiscal headers, GSTIN, PAN, and token verification QR string.
- `RefundWorkflowService`:
  - `initiate_refund_request(invoice_id, payment_id, items, reason, user)`: Validates that requested refund ≤ paid amount; creates `RefundRequest` in `PENDING` status.

#### 5. Role Permissions
- `IsCashierOrAbove`: Access to create invoices, accept payments, collect deposits, request refunds.
- `IsBillingSupervisorOrAbove`: Authorize refunds, void unpaid invoices.
- Strict isolation: Cashiers cannot approve their own discount requests or disburse refunds without supervisor approval.

#### 6. Events/Integrations with Other Departments
- **Receipt Dispatch Event**: On invoice settlement, emit event to Notification Service for mock WhatsApp/SMS delivery of the PDF receipt link.
- **Deposit Credit Event**: Patient deposit creation immediately updates patient wallet available for checkout deduction.

#### 7. Frontend Screens Involved
- [billingService.ts](file:///d:/North-Hospital/frontend/src/services/billingService.ts): Full typed API client methods matching all endpoints.
- [PrintableReceiptModal.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/PrintableReceiptModal.tsx) & [CashierReceiptModal.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/CashierReceiptModal.tsx): Dual-mode 80mm thermal receipt and A4 tax invoice print preview.

#### 8. Tests Required
- Atomic payment test: Concurrent payment attempts on the same invoice locked with `select_for_update`.
- Multi-tender math test: Splitting invoice across Cash, Card, UPI, and Deposit deduction; validating invoice balance drops to exact zero.
- Deposit overdraft test: Attempting to deduct more deposit than `available_balance` raises `ValidationError`.

#### 9. Dependencies on Previous Phases
- None (Foundation Phase).

---

### Phase 2 — Department → Billing Charge Integration `[COMPLETED]`
*Status: Fully Implemented & Verified (30/30 Django tests passing, Frontend bundle builds cleanly with zero errors)*


#### 1. Existing Models/Components Reused
- [Appointment](file:///d:/North-Hospital/backend/apps/appointments/models.py) (`apps.appointments.models.Appointment`)
- [LabOrder](file:///d:/North-Hospital/backend/apps/lab/models.py) (`apps.lab.models.LabOrder`)
- [DispenseOrder](file:///d:/North-Hospital/backend/apps/pharmacy/models.py) (`apps.pharmacy.models.DispenseOrder`)
- [InpatientAdmission](file:///d:/North-Hospital/backend/apps/ipd/models.py) (`apps.ipd.models.InpatientAdmission`)
- `BillableChargeItem` (from Phase 1)
- `TariffMaster` (Billing price source of truth)

#### 2. New Database Models
- `DepartmentChargeEvent`: Audit log of all charge emissions from clinical sources.
  - Fields: `id`, `event_uuid`, `source_department` (`OPD`, `LAB`, `PHARMACY`, `IPD`, `OT`), `patient` (FK), `encounter_type`, `encounter_id`, `tariff_code`, `quantity`, `override_allowed` (bool), `status` (`QUEUED`, `INVOICED`, `CANCELLED`), `created_at`.
- `DepartmentGatingRule`: Configuration defining which clinical actions require a settled bill.
  - Fields: `department`, `gating_action` (`LAB_SAMPLE_COLLECTION`, `PHARMACY_MEDICINE_RELEASE`, `IPD_DISCHARGE_EXIT`, `CONSULTATION_ENTRY`), `is_hard_gate` (bool).

#### 3. API Endpoints
- `POST /api/v1/billing/charges/emit/`: Internal/service endpoint for clinical departments to push billable charges.
- `GET /api/v1/billing/charges/queue/`: Fetch unbilled charges filterable by department, patient UHID, urgency (`STAT` vs `ROUTINE`).
- `GET /api/v1/billing/gates/check-clearance/`: Query whether a clinical action is cleared (e.g. `?action=LAB_SAMPLE_COLLECTION&order_id=...`).
- `POST /api/v1/billing/charges/cancel-event/`: Cancel unbilled charge if clinical order is cancelled before billing.

#### 4. Services/Business Logic
- `DepartmentChargeIntegrationService`:
  - `emit_opd_consultation_charge(appointment)`: Emits consultation fee charge based on doctor specialty/chamber tariff upon patient check-in.
  - `emit_lab_test_charges(lab_order)`: Resolves each ordered test's official base rate from `TariffMaster`, creates `BillableChargeItem` rows, tags lab order as `AWAITING_PAYMENT`.
  - `emit_pharmacy_dispense_charge(dispense_order)`: Receives verified dispense order, calculates total using verified batch rates, handles routing (`PAY_AT_PHARMACY` vs `PAY_AT_RECEPTION`).
  - `is_lab_sample_collection_allowed(order_id)`: **Sample Collection Hard Gate** — Returns `True` only if the order's charge item is associated with a `PAID` invoice or authorized cashless TPA/IPD admission.

#### 5. Role Permissions
- System/Service level execution: Clinical staff (`DOCTOR`, `LAB_TECH`, `PHARMACIST`, `NURSE`) can trigger charge emission by performing clinical actions, but have **zero direct access** to mutate prices, invoices, or payment tables.

#### 6. Events/Integrations with Other Departments
- **OPD Check-in Integration**: Receptionist marks patient arrived -> triggers consultation charge in Billing queue.
- **Lab Order Integration**: Doctor orders CBC + Lipid Profile -> Billing creates unbilled charge items; Lab order displays `PAYMENT REQUIRED` chip.
- **Sample Collection Hard Gate Integration**: Phlebotomist scans vacutainer -> Lab checks `is_lab_sample_collection_allowed`. If unpaid, label printing is blocked with amber alert *"Bill Unsettled at Cash Counter"*.
- **Pharmacy Dispense Integration**: Pharmacist dispenses medicine -> if routed to central cashier, token slip `TKN-PH-XXXX` queues in Billing.

#### 7. Frontend Screens Involved
- [InvoiceQueueTab.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/InvoiceQueueTab.tsx): Frontline unbilled worklist categorizing pending charges by department pill (`All`, `OPD`, `Lab`, `Pharmacy`, `IPD`).
- [LabTechnicianQueueView.tsx](file:///d:/North-Hospital/frontend/src/pages/lab/components/LabTechnicianQueueView.tsx): Sample collection button disabled with tooltip when bill is unpaid.

#### 8. Tests Required
- Lab Hard Gate Test: Phlebotomist cannot collect sample or generate barcodes for unpaid order; instantly unlocks when `Payment` is confirmed.
- Pharmacy Invariant Test: Refactored pharmacy settlement emits charge event without directly creating `Invoice` records.
- Tariff Integrity Test: Clinical order charges always pull price from `TariffMaster`, never client-submitted values.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing Backend).

---

### Phase 3 — Billing Executive / Cashier `[COMPLETED]`
*Status: Implemented & Verified (57/57 Django billing tests passing incl. `Phase3CashierWorkspaceTestCase` and `Phase3CashierGapClosureTestCase`; 38/38 cashier UI logic tests via `npm run test:cashier`; frontend `tsc -b && vite build` clean).*

*Gap closure (approved before Phase 4):*
- *Add service from Tariff Master — `POST /cashier/add-service/` (price, GST and department resolved server-side from `TariffMaster`; client prices ignored), `POST /cashier/add-service/{id}/remove/` (only `COUNTER-` lines still `PENDING`; clinical charges → 403).*
- *Quick walk-in billing — `WalkinBillDrawer` (new or registered patient, Tariff Master lines, 5% schemes, multi-tender) on the existing atomic `POST /cashier/quick-walkin/`.*
- *Save draft — new `InvoiceStatus.DRAFT` (migration `0007`). `POST /cashier/drafts/` parks charges as a non-fiscal `DRF-YYYYMM-NNNNN` (discount guard applies); `POST /cashier/drafts/{id}/collect/` finalises to `INV-` and settles atomically; `POST /cashier/drafts/{id}/discard/` returns charges to the queue and keeps any approval request. Drafts are excluded from dashboard invoice counts and the receipts repository and cannot be paid via `/payments/multi-tender/`.*
- *Invoice numbering now continues from the highest issued `INV-YYYYMM-` number instead of `count()+1`, so discarded drafts never cause collisions or gaps.*

*Access control hardening (approved before Phase 4):*
- *Every billing endpoint requires login — anonymous reads and the 17 former `AllowAny` endpoints (payments, shifts, tariffs, charge emission, gating rules…) now return 401. Covered by `BillingAccessControlTestCase`.*
- *Pricing masters & gating rules: readable by hospital staff, writable by Billing Admin and above only (cashiers and supervisors get 403). Charge emit/cancel and gate clearance checks: any logged-in hospital staff (patients excluded).*
- *`FINANCE_MANAGER` added to the backend `RoleType` (accounts migration `0006`) with read-only billing access. Billing Supervisor/Manager/Admin roles added to the frontend and allowed into `/billing`.*
- *Pharmacy: reception token payments are confirmed from Billing's settlement (no second payment; login required); partial dispenses bill only dispensed items; pay-at-pharmacy invoices carry one consolidated dispense line (approved).*

*Implementation notes:*
- *Frontend lives in [`frontend/src/pages/billing/executive/`](file:///d:/North-Hospital/frontend/src/pages/billing/executive) and is routed at `/billing/*` (`/billing`, `/billing/queue`, `/billing/receipts`, `/billing/requests`, `/billing/counter`). The previous localStorage mock `BillingDashboard` is no longer routed; the legacy `CashierWorkspace` (shift open/close, walk-in) stays reachable as **Counter Desk** until Phase 4 replaces it.*
- *The live queue is served at `GET /api/v1/billing/cashier/live-queue/` (patient-grouped, STAT first); `/cashier/queue/` keeps its legacy invoice-shaped payload. Additional endpoints: `POST /cashier/bill-and-collect/`, `POST /cashier/tender-calculator/`, `POST /cashier/discount-check/`, `GET|POST /approvals/`, `POST /approvals/{id}/decide/` (`SupervisorApprovalRequest`, migration `0006`).*
- *Client maths ([`cashierMath.ts`](file:///d:/North-Hospital/frontend/src/pages/billing/executive/cashierMath.ts)) mirrors `CashierWorkspaceService`; the server remains authoritative and re-validates discount ceiling, tender split and tariff prices.*
- *Not in Phase 3 scope (screens present in the v2 spec): IPD Running Bills → Phase 9; Counter closing / denomination tally → Phase 4; refund disbursement & request withdrawal → Phase 5; WhatsApp/e-mail receipt delivery awaits the notification service.*

#### 1. Existing Models/Components Reused
- `Invoice`, `InvoiceItem`, `Payment`, `BillingCounter`, `CounterShift`, `BillableChargeItem`
- [MultiTenderPaymentModal.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/MultiTenderPaymentModal.tsx)
- [ReceiptThermalPreviewModal.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/ReceiptThermalPreviewModal.tsx)

#### 2. New Database Models
- No new core models; utilizes operational tables established in Phase 1 & 2.

#### 3. API Endpoints
- `GET /api/v1/billing/cashier/dashboard/`: Cashier KPI metrics (invoices today, shift collections by tender, pending queue count, turnaround SLA).
- `GET /api/v1/billing/cashier/queue/`: Live streaming queue of unbilled patient charges.
- `GET /api/v1/billing/cashier/patient-workspace/{uhid}/`: 360° patient financial account view: unbilled charges, past invoice history, deposit balance, active insurance.
- `POST /api/v1/billing/cashier/quick-walkin/`: Create and immediately settle ad-hoc walk-in items (e.g. rapid test, health certificate fee).

#### 4. Services/Business Logic
- `CashierWorkspaceService`:
  - Aggregates cashier shift totals, queue count, and average serving turnaround time.
  - Multi-tender split calculator logic: validates `Cash + Card + UPI + Deposit = Total`.
  - Cash Change Assistant: calculates change due in physical notes.
  - Discretionary Discount Guard: if cashier inputs discount > 5%, system blocks direct settlement and generates a `SupervisorApprovalRequest`.

#### 5. Role Permissions
- `Role: CASHIER` / `BILLING_EXECUTIVE`:
  - Allowed: Look up patients, review queued charges, consolidate bills, accept payments across tenders, accept advance deposits, print receipts, initiate refund requests.
  - Strictly Forbidden: Cannot apply discounts > 5%, cannot approve refunds, cannot cancel invoices, cannot edit tariffs.

#### 6. Events/Integrations with Other Departments
- On bill payment: emits event unlocking the corresponding clinical encounter (e.g. updates doctor token to `READY_FOR_CONSULTATION`, unlocks lab vacutainer label printing).

#### 7. Frontend Screens Involved
- [Billing Executive Workspace v2](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Executive%20Workspace%20v2.dc.html) specification:
  1. **Cashier Dashboard (`/billing`)**: 5 KPI cards, active queue snapshot, shift collection meter.
  2. **Invoice Queue (`/billing/queue`)**: Department filter pills, search by UHID/name/token, STAT urgent badges.
  3. **Patient Billing Workspace Drawer**: 560px slide-over showing unbilled items, previous bills, and insurance coverage.
  4. **Multi-Tender Payment Collection Drawer**: Visual tender allocation bar, change assistant, card TID and UPI QR trigger.
  5. **Receipts & Invoices Repository (`/billing/receipts`)**: Searchable invoice history, reprint buttons, digital delivery log.

#### 8. Tests Required
- Cashier UI Component Tests: Verifying search-as-you-type on UHID, tender allocation arithmetic, and change computation.
- Cashier Discount Ceiling Test: Submitting a 10% discount without supervisor credentials fails with `403 Forbidden - Supervisor Approval Required`.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing Backend), Phase 2 (Department Charge Integration).

---

### Phase 4 — Counter Shift & Cash Control `[COMPLETED]`
*Status: Implemented & Verified (145/145 Django tests incl. `Phase4CounterShiftCashControlTestCase` (14); 46/46 cashier UI logic tests; frontend build clean; 19/19 live HTTP smoke checks of the full open → collect → pickup → close → investigate → sign-off → vault cycle).*

*Implementation notes:*
- *Models (migration `0008`): `CashDenominationTally` (₹2000–₹10 notes + coins amount), `CashPickupVoucher` (`PCK-`, REQUESTED → COMPLETED), `VaultHandover` (`VLT-`); `CounterShift` gains card/UPI expected & variance, `variance_status` (`GREEN_MATCH`/`RED_VARIANCE`), `UNDER_INVESTIGATION` status (`INQ-`), supervisor finding, `closed_with_variance`, vault link; `PatientDeposit.shift`, `RefundRequest.disbursed_shift`.*
- *`CounterShiftControlService`: expected cash = float + cash payments + cash deposits − cash refunds − completed pickups; card/UPI reconciled against EDC/UPI batch totals; any variance requires a ≥5-char explanation; sign-off/pickup are four-eyes (never on own shift).*
- *Shift guard: invoices, payments (multi-tender & legacy), bill-and-collect, draft collection, quick walk-in and deposits require the acting user's own OPEN shift (`400 No Active Shift`) and post to it; cash refunds must be disbursed from the disburser's open shift. Drafts (no money) remain allowed. The old "any open shift" fallback is removed.*
- *Endpoints: `POST /shifts/open/` (denominations), `GET /shifts/current/` (register, utilisation, counters, history), `POST /shifts/close/`, `POST /shifts/cash-pickup/` (cashier request / supervisor execute with `shift_id`), `POST /shifts/{id}/supervisor-signoff/` (`SIGN_OFF`, `SIGN_OFF_WITH_VARIANCE`, `INVESTIGATE`), `GET /shifts/supervisor-board/`, `POST /shifts/vault-handover/`.*
- *Frontend: `/billing/shift` (Counter Shift: open with note count, KPIs, ₹50K drawer meter, register, pickup request, closing drawer) and `/billing/closing` for supervisor roles (live drawers + pickup, closing review, sign-off/investigation, vault handover). Workspace shows a "Counter closed" banner and disables collection without an open shift. `/billing/counter` redirects to `/billing/shift`; the legacy `CashierWorkspace` is no longer routed.*

#### 1. Existing Models/Components Reused
- [BillingCounter](file:///d:/North-Hospital/backend/apps/billing/models.py#L68-L86) (`apps.billing.models.BillingCounter`)
- [CounterShift](file:///d:/North-Hospital/backend/apps/billing/models.py#L88-L118) (`apps.billing.models.CounterShift`)
- `Payment`, `User`

#### 2. New Database Models
- `CashDenominationTally`: Denomination counts for shift opening and closing.
  - Fields: `shift` (FK), `type` (`OPENING_FLOAT`, `CLOSING_COUNT`), `count_2000`, `count_500`, `count_200`, `count_100`, `count_50`, `count_20`, `count_10`, `count_coins`, `total_amount`, `recorded_at`.
- `CashPickupVoucher`: Inter-shift safe drop voucher when drawer cash exceeds threshold.
  - Fields: `id`, `voucher_number` (`PCK-YYYYMM-XXXXX`), `shift` (FK), `amount`, `supervisor` (FK User), `reason` (`THRESHOLD_LIMIT_EXCEEDED`, `ROUTINE_SWEEP`), `timestamp`.

#### 3. API Endpoints
- `POST /api/v1/billing/shifts/open/`: Open counter session by entering opening float and denomination breakdown.
- `GET /api/v1/billing/shifts/current/`: Real-time register summary (opening float, cash/card/UPI collected, expected cash in drawer).
- `POST /api/v1/billing/shifts/cash-pickup/`: Supervisor cash sweep when drawer exceeds ₹50,000 limit.
- `POST /api/v1/billing/shifts/close/`: Cashier submits physical count breakdown and closes session.
- `POST /api/v1/billing/shifts/{id}/supervisor-signoff/`: Supervisor approves closing, registers variance, signs off cash handover.

#### 4. Services/Business Logic
- `CounterShiftControlService`:
  - `validate_active_shift(user, counter_id)`: Enforces that a cashier cannot transact any bill or deposit without an active `OPEN` shift.
  - `compute_drawer_variance(shift_id, physical_cash)`: `Variance = physical_cash - (opening_float + cash_payments - cash_refunds - cash_pickups)`.
  - Enforces mandatory explanation text if `abs(variance) > 0.00`.
  - `execute_cash_pickup(shift_id, amount, supervisor)`: Deducts from drawer expected cash, logs `CashPickupVoucher`.

#### 5. Role Permissions
- Cashier can open shift, enter closing denomination tally, and request cash pickup.
- Only `BILLING_SUPERVISOR` or `BILLING_ADMIN` can execute cash pickup and sign off counter closings.

#### 6. Events/Integrations with Other Departments
- **Vault Transfer Event**: Approved shift closing transfers verified cash bag to hospital central treasury/vault ledger.

#### 7. Frontend Screens Involved
- [CounterShiftTab.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/cashier/ShiftDrawerModal.tsx): Open/Close Shift interface, live cash utilization progress bar, physical denomination input table.
- [Billing Supervisor Counter Closing](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Supervisor%20Workspace.dc.html#counter-closing): Supervisor reconciliation view comparing cashier count against system register.

#### 8. Tests Required
- Shift Transaction Guard: Attempting to collect payment without an open shift returns `400 Bad Request - No Active Shift`.
- Denomination Math Test: Automated calculation of `500 * 10 + 200 * 5 = ₹6,000`.
- Variance Detection Test: Accurately tags zero variance as `GREEN_MATCH`, and discrepancy as `RED_VARIANCE` requiring mandatory notes.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing Backend), Phase 3 (Billing Executive / Cashier).

---

### Phase 5 — Billing Supervisor `[COMPLETED]`

*Implementation notes:*
- *Models (migration `0009`): `SupervisorApprovalRequest` gains `ESCALATED` status, `escalation_reason` (`SELF_RAISED`, `ABOVE_LIMIT`, `SLA_BREACH`, `MANUAL`), counter/shift context, `requested_discount_percent`/`requested_amount`, `review_notes`, `sla_expires_at`; `RefundRequest` gains `ESCALATED`, refunded lines (`refund_items`), `original_tender`, `requested_shift`, `review_notes`; `assisted_by` on `Invoice`, `Payment`, `PatientDeposit` (set automatically when a transaction posts on another cashier's shift); new `BillingAuditEvent` (audit stream).*
- *`SupervisorGovernanceService`: approval tiers (Billing Supervisor decides within 20% or ₹10,000 per bill and refunds up to ₹10,000 — the spec's limit, which supersedes the 15% noted below; Billing Admin/Manager decide escalations without a limit). Four-eyes on every decision. Requests raised by a supervisor (including counter mode) skip a level to Billing Admin. Discounts can be approved at a lower percent, never higher. Rejections need a ≥5-char note. SLA: red badge after 15 min, auto-escalation after 60 min (evaluated lazily on queue/dashboard reads — no scheduler).*
- *Refund review: each refunded line is verified against its clinical order (lab sample/order status, appointment status, pharmacy return); approval is blocked while any check fails. Card/UPI refunds reverse immediately with a credit note; cash refunds are approved and then paid by a cashier from their open drawer (`POST /refunds/{id}/disburse-cash/`).*
- *Voids: cashiers request a void of an UNPAID invoice with nothing collected (`POST /invoices/{id}/void-request/`); approval cancels it and returns its charges to the queue. Paid invoices must be refunded first.*
- *Counter mode: the supervisor enters an open counter (`POST /supervisor/counter-mode/`); the frontend then sends `X-Billing-Assist-Shift` on billing calls, so money posts to the assisted cashier's drawer (per the Executive spec banner) tagged `assisted_by`, shown on receipts. In counter mode the supervisor's direct-discount privilege is off. Enter/exit are audited.*
- *Endpoints: `GET /supervisor/dashboard/`, `GET /supervisor/approvals/`, `POST /supervisor/approvals/{id}/action/` (`APPROVE` [+`approved_percent`], `REJECT`, `ESCALATE`), `GET /supervisor/refunds/`, `POST /supervisor/refunds/{id}/disburse/`, `POST /supervisor/counter-mode/`, `GET /supervisor/audit-stream/`, `POST /supervisor/audit-stream/{id}/review/`. The legacy `/approvals/{id}/decide/` and `/refunds/{id}/approve/` now apply the same four-eyes and limit rules.*
- *Audit stream sources: high-value cash (≥ ₹40,000), discount above 20% requested, voids, approval/refund decisions and escalations, cash refund payouts, counter mode, pickups, closings, vault handovers.*
- *Frontend: `/billing/supervisor` workspace (Dashboard, Approvals, Refunds, Counter Closing — moved from `/billing/closing`, Audit Stream) with a workspace switcher into counter mode; sticky amber counter-mode banner in the executive workspace; "Request void" in Receipts; "Pay from drawer" for approved cash refunds in My Requests; patient drawer polls while a request is open so decisions unlock collection without a refresh. Supervisor roles land on `/billing/supervisor`.*
- *Deferred: Credit & Outstanding, write-off and credit-discharge requests (Phases 8–9), Shift Reports (Phase 11), push notifications to Lab/Pharmacy on refunds, closing reminder.*

#### 1. Existing Models/Components Reused
- `CounterShift`, `BillingCounter`, `RefundRequest`, `Invoice`, `Payment`
- [hospitalStaffStore.ts](file:///d:/North-Hospital/frontend/src/pages/admin/setup/organization/hospitalStaffStore.ts)

#### 2. New Database Models
- `SupervisorApprovalRequest`: Unified queue for all operational financial exceptions.
  - Fields: `id`, `request_number` (`APR-YYYYMM-XXXXX`), `request_type` (`DISCOUNT_OVERRIDE`, `INVOICE_VOID`, `REFUND_DISBURSAL`, `CREDIT_LIMIT_OVERRIDE`), `invoice` (FK nullable), `patient` (FK), `counter` (FK), `requested_by` (FK User), `requested_value`, `reason`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `ESCALATED`), `reviewed_by` (FK User nullable), `reviewed_at` (DateTimeField nullable), `review_notes` (TextField), `sla_expires_at` (DateTimeField).

#### 3. API Endpoints
- `GET /api/v1/billing/supervisor/dashboard/`: Shift 1 overview, active counter drawer statuses, oldest pending approvals, critical cash alerts.
- `GET /api/v1/billing/supervisor/approvals/`: Dual-pane approvals queue (discounts, voids, credit overrides).
- `POST /api/v1/billing/supervisor/approvals/{id}/action/`: Approve, reject, or escalate request.
- `GET /api/v1/billing/supervisor/refunds/`: Refund requests list with original receipt voucher attachment.
- `POST /api/v1/billing/supervisor/refunds/{id}/disburse/`: Approve refund and issue Credit Note voucher.
- `GET /api/v1/billing/supervisor/audit-stream/`: Live compliance stream (price overrides, voids, high cash transactions).

#### 4. Services/Business Logic
- `SupervisorGovernanceService`:
  - **Self-Approval Guard**: `requested_by != reviewed_by` invariant enforced at database and service layer. If supervisor raises a request in Counter Mode, it automatically escalates to Billing Manager.
  - **SLA Escalation Engine**: Requests unreviewed after 15 minutes trigger escalation alerts; after 60 minutes auto-escalate to Billing Manager.
  - **Supervisor Counter Mode Architecture**: Allows a supervisor to switch into any active counter in their shift as an assistant. All transactions post with `assisted_by = supervisor_id`. Cash collection requires supervisor's own open shift.

#### 5. Role Permissions
- `Role: BILLING_SUPERVISOR`:
  - Can approve discounts up to 15%, approve refunds up to ₹10,000, void unpaid invoices, sign off shift closings, switch to Counter Mode.
  - Cannot modify baseline master tariffs or system tax rules.

#### 6. Events/Integrations with Other Departments
- **Approval Decision Webhook**: Approval immediately pushes status update to cashier's active drawer, allowing instant checkout without page refresh.
- **Refund Audit Notification**: Approved refund for unperformed lab test or returned drug notifies Lab or Pharmacy store for audit consistency.

#### 7. Frontend Screens Involved
- [Billing Supervisor Workspace](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Supervisor%20Workspace.dc.html):
  1. **Supervisor Dashboard (`/billing/supervisor`)**: Live counters grid with drawer cash progress bars, oldest approvals card, alerts list.
  2. **Approvals Tab (`/billing/supervisor/approvals`)**: Dual-pane review interface with discount justification and invoice line preview.
  3. **Refunds Tab (`/billing/supervisor/refunds`)**: Review original payment tender, approve cash voucher disbursal.
  4. **Counter Closing Tab**: Shift sign-off and safe-drop authorization.
  5. **Workspace Switcher Menu & Sticky Amber Context Banner**: *"Viewing as Billing Supervisor · Counter 2 · Assisting on Amit Sharma's shift"*.

#### 8. Tests Required
- Self-Approval Prevention Test: Supervisor cannot approve their own discount request.
- SLA Timer Test: Expired approvals flagged with red SLA badge and escalated to manager tier.
- Counter Mode Assist Test: Invoices created in assist mode have `assisted_by` tagged and visible in receipt footers.

#### 9. Dependencies on Previous Phases
- Phase 3 (Billing Executive), Phase 4 (Counter Shift & Cash Control).

---

### Phase 6 — Tariffs, Packages & Pricing Governance `[COMPLETED]`

*Implementation notes:*
- *Models (migration `0010`): `TariffRevisionLog` (immutable price versions with `effective_from`; only `applied_at` is stamped when a scheduled version goes live; save/delete guarded), `TariffChangeRequest` (`TCR-`; department proposals: PENDING → PUBLISHED / APPROVED-scheduled / REJECTED / REVISION), `PackageInclusionItem` (INCLUDED with `max_quantity_covered` + `is_mandatory`, or EXCLUDED), `EmergencyMarkupSchedule` (time windows that may wrap midnight, weekend flag, per department or ALL). `TariffMaster.owner_department`; `ServicePackage` gains `status` (DRAFT/SCHEDULED/ACTIVE/RETIRED, `is_active` kept in sync), `effective_from`, `length_of_stay_days`, `overrun_rule`, publisher.*
- *Governance (per the Admin spec, which extends this plan): departments (any hospital staff) propose price changes or new services with justification and effective date; impact is computed (30-day charge volume, packages using the code). Billing admins approve, reject or request revision (note required); changes above 15% need CFO confirmation recorded in the note; the proposer can never publish their own change. Approval with today's date publishes immediately; a future date schedules a version. Admin direct edits (`PATCH /tariffs/{code}/`) and new services require a justification and write a version.*
- *Price at time of charge: charges snapshot `unit_price` when posted, so open bills keep their price; due versions are applied lazily before any price is read (tariff/package reads, quotes, OPD/Lab emission, counter services, walk-ins) — no scheduler needed. Published prices sync to the Lab catalogue (`LabTest.price`).*
- *Pricing: `get_effective_tariff(..., at=)` applies a matching markup schedule for emergency encounters (e.g. night +50%), else the tariff's flat emergency markup. `calculate_quote` accepts `package_code` and `at`: the package is one line, included services are absorbed at ₹0 up to their allowance, extra units and exclusions bill at tariff; `is_service_covered_by_package(package, service_code, current_quantity)`.*
- *Endpoints: `GET/POST /tariffs/`, `GET/PATCH /tariffs/{code}/` (with price history), `GET/POST /tariffs/change-requests/`, `POST /tariffs/change-requests/{id}/decide/`, `POST /tariffs/batch-import/` (CSV, dry run then all-or-nothing), `GET/POST /packages/`, `GET/PATCH /packages/{code}/`, `POST /packages/{code}/publish|retire/`, `GET /packages/{code}/coverage/`, `GET/POST /pricing/markup-schedules/`, `PATCH /pricing/markup-schedules/{id}/`, `POST /pricing/calculate-quote/`. Cashiers and supervisors stay read-only; every step is written to the audit stream.*
- *Frontend: `/billing/admin` workspace (Billing Admin landing; Manager, Hospital/Super Admin too) — Tariff Master (KPIs, change queue with review drawer & CFO check, hospital tariff with owner/scheduled price, service drawer with price history, admin edit, propose change, add service, CSV import with preview), Packages (definitions, inclusion/exclusion builder, publish/schedule/retire, coverage check), Pricing (quote simulator with package, emergency time and sponsor; markup schedules). The older unrouted `TariffMasterTab`/`PackageManagementTab`/`PricingQuotationSimulator` are superseded.*
- *Deferred: patient package enrolment and the Consumption tab (ledger absorption, overrun conversion — Phase 9), department-side "propose price" buttons inside each clinical workspace (the API is open to all staff), insurer/corporate derived schedules (Phase 8), OT/Radiology catalogue sync (those modules have no price copy yet).*

#### 1. Existing Models/Components Reused
- [TariffMaster](file:///d:/North-Hospital/backend/apps/billing/models.py#L278-L295) (`apps.billing.models.TariffMaster`)
- [ServicePackage](file:///d:/North-Hospital/backend/apps/billing/models.py#L297-L315) (`apps.billing.models.ServicePackage`)

#### 2. New Database Models
- `TariffRevisionLog`: Immutable historical price ledger.
  - Fields: `id`, `tariff` (FK), `old_base_price`, `new_base_price`, `effective_from`, `revised_by` (FK User), `justification`, `created_at`.
- `PackageInclusionItem`: Structured line item inclusions for surgical bundles.
  - Fields: `id`, `package` (FK), `service_code`, `service_name`, `department`, `max_quantity_covered`, `is_mandatory` (bool).
- `EmergencyMarkupSchedule`: Time-based emergency and holiday surcharge rules.
  - Fields: `department`, `markup_percentage`, `applies_from_time`, `applies_to_time`, `is_weekend_active`.

#### 3. API Endpoints
- `GET /api/v1/billing/tariffs/`: Filterable service price catalog with search, department filtering, and pagination.
- `POST /api/v1/billing/tariffs/`: Create new tariff code with base price, emergency markup, and GST slab.
- `PATCH /api/v1/billing/tariffs/{id}/`: Update tariff with mandatory audit justification (creates `TariffRevisionLog`).
- `POST /api/v1/billing/tariffs/batch-import/`: Bulk CSV/Excel upload for hospital-wide tariff revisions.
- `GET /api/v1/billing/packages/`: Composite surgery packages with structured inclusions.
- `POST /api/v1/billing/packages/`: Create surgical package bundle with inclusions/exclusions.
- `POST /api/v1/billing/pricing/calculate-quote/`: Real-time pricing calculator simulator.

#### 4. Services/Business Logic
- `TariffPricingService`:
  - `get_effective_tariff(service_code, encounter_type, patient_category, is_emergency)`: Resolves rate, emergency night markup, and applicable GST slab.
  - `calculate_quote(items, encounter_type, corporate_account_id)`: Generates itemized breakdown, tax rates, total net, and sponsor vs patient responsibility.
  - `is_service_covered_by_package(package_id, service_code, current_quantity)`: Checks if an ordered diagnostic, consumable, or bed day is absorbed by the patient's active package.

#### 5. Role Permissions
- `Role: BILLING_ADMIN`, `HOSPITAL_ADMIN`, `FINANCE_CFO`:
  - Only administrators can create or alter master tariffs, surgical packages, and emergency markup percentages.
  - Cashiers and Supervisors have strictly read-only tariff lookup access.

#### 6. Events/Integrations with Other Departments
- **Tariff Published Event**: Price updates immediately synchronize across OPD doctor fee menus, Lab catalog, OT surgery slabs, and Radiology ordering desks.

#### 7. Frontend Screens Involved
- [Tariff Master Tab](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Admin%20Workspace%20v3.dc.html#tariffs) (A-05): Global service directory, department pills, base rate, GST slab, emergency markup, Add/Edit modal.
- [Package Management Tab](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Admin%20Workspace%20v3.dc.html#packages) (A-06): Surgery bundle builder with inclusion/exclusion tagging.
- [Pricing Quotation Simulator](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Admin%20Workspace%20v3.dc.html#quote-calc): Live interactive quote sandbox.

#### 8. Tests Required
- Effective Rate Calculation Test: Correctly adds emergency surcharge during night hours.
- Package Inclusions Test: Covered CBC test under Knee Replacement package charges ₹0 to patient ledger; non-included test charges standard tariff.
- Tariff Revision Audit Test: Updating a price creates an immutable revision log with author and timestamp.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing Backend), Phase 2 (Department Charge Integration).

---

### Phase 7 — Billing Admin Core [COMPLETED]

#### 1. Existing Models/Components Reused
- `BillingCounter`, `CounterShift`, `TariffMaster`, `ServicePackage`, `CorporateAccount`, `User`
- [hospitalStaffStore.ts](file:///d:/North-Hospital/frontend/src/pages/admin/setup/organization/hospitalStaffStore.ts)

#### 2. New Database Models
- `ApprovalMatrixTier`: Threshold configurations per financial exception.
  - Fields: `tier_level` (`SUPERVISOR`, `MANAGER`, `ADMIN`, `CFO`), `action_type` (`DISCOUNT`, `REFUND`, `VOID`, `WRITE_OFF`), `max_percentage`, `max_amount`, `sla_minutes`.
- `BillingPolicyRule`: Hospital-wide financial governance rules.
  - Fields: `rule_code`, `rule_name`, `category` (`DISCOUNT`, `REFUND`, `CASH_DRAWER`, `DISCHARGE`), `parameter_value` (JSONField), `is_active`.
- `CounterHardwareRegistry`: Physical hardware binding for billing counters.
  - Fields: `counter` (FK), `ip_address`, `mac_address`, `thermal_printer_name`, `pos_terminal_tid`, `status`.

#### 3. API Endpoints
- `GET /api/v1/billing/admin/overview/`: Revenue Command executive dashboard metrics (revenue today, MTD, leakage at risk, sync status).
- `GET /api/v1/billing/admin/counters/`: Master directory of physical billing counters and hardware.
- `POST /api/v1/billing/admin/counters/`: Register new billing counter station.
- `GET /api/v1/billing/admin/staff-roster/`: Shift duty roster of billing cashiers and supervisors.
- `POST /api/v1/billing/admin/staff-roster/`: Assign cashier to counter and shift schedule.
- `GET/PUT /api/v1/billing/admin/approval-matrix/`: Manage approval limits across tiers.
- `GET/PUT /api/v1/billing/admin/policies/`: Configure discount ceilings, refund limits, and cash drawer caps.

#### 4. Services/Business Logic
- `BillingAdminGovernanceService`:
  - Enforces the 4-tier escalation ladder: Cashier -> Supervisor -> Manager -> Admin -> CFO.
  - Manages counter status: marking counters active, maintenance, or closed.
  - Staff duty roster validation: prevents scheduling overlapping cashier shifts on the same counter.

#### 5. Role Permissions
- `Role: BILLING_ADMIN`, `HOSPITAL_ADMIN`:
  - Full authority over master configuration, approval matrices, counter bindings, and staff duty rosters.

#### 6. Events/Integrations with Other Departments
- **Roster Publication Event**: Updates cashier login permissions across hospital physical workstations.

#### 7. Frontend Screens Involved
- [Billing Admin Workspace v3](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Admin%20Workspace%20v3.dc.html) specification:
  1. **Revenue Command (`/department/billing` - A-01)**: Executive financial dashboard, revenue vs budget, leakage at risk, sync status center.
  2. **Billing Counters Directory (`/department/billing/counters` - A-14)**: Hardware bindings, station designations.
  3. **Staff & Shift Scheduling (`/department/billing/staff` - A-19)**: Visual roster calendar across Morning, Evening, and Night shifts.
  4. **Approval Matrix Configuration (`/department/billing/approval-matrix` - A-15)**: Editable approval ceiling bands.
  5. **Policy Rules Engine (`/department/billing/policies` - A-16)**: System threshold parameter controls.

#### 8. Tests Required
- Approval Limit Check: Supervisor cannot approve discount exceeding matrix threshold; system auto-routes to Manager/Admin.
- Hardware Terminal Lock Test: Rejects shift opening from unapproved IP when hardware binding is enabled.

#### 9. Dependencies on Previous Phases
- Phase 4 (Counter Shift), Phase 5 (Supervisor), Phase 6 (Tariffs).

---

### Phase 8 — Insurance / TPA + Corporate `[COMPLETED]`

#### 1. Existing Models/Components Reused
- [CorporateAccount](file:///d:/North-Hospital/backend/apps/billing/models.py) (`apps.billing.models.CorporateAccount`) — enriched with contract metadata, settlement TAT, tariff discount %, plans JSON, required docs list, signatories, and covered services.
- `Invoice`, `Payment`, `Patient`, `InpatientAdmission`

#### 2. New Database Models & Migrations
- [TPAClaimRecord](file:///d:/North-Hospital/backend/apps/billing/models.py): Cashless claim lifecycle management.
  - Fields: `id`, `claim_number` (`CLM-YYYYMM-XXXXX`), `patient` (FK), `admission` (FK nullable), `corporate_account` (FK TPA Insurer), `policy_number`, `tpa_member_id`, `requested_amount`, `pre_auth_amount`, `pre_auth_status` (`PENDING`, `APPROVED`, `QUERY_RAISED`, `REJECTED`, `PARTIAL`), `gop_letter_number`, `enhancement_amount`, `claim_status` (`PRE_AUTH`, `CLAIM_FILED`, `APPROVED`, `SETTLED`, `DENIED`), `settled_amount`, `deduction_amount`, `denial_reason`, `source`, `plan_name`, `dossier_data`, `tracking_notes`, `created_at`.
- [CorporateCreditVoucher](file:///d:/North-Hospital/backend/apps/billing/models.py): Corporate credit authorization vouchers.
  - Fields: `id`, `voucher_number` (`CORP-VOUCH-XXXXX`), `corporate_account` (FK), `employee_id`, `employee_name`, `patient` (FK), `relationship`, `approved_credit_ceiling`, `utilized_amount`, `validity_date`, `is_verified`, `verified_by` (FK User), `notes`, `created_at`.
- Migration: `0013_corporateaccount_billing_cycle_and_more.py` applied cleanly.

#### 3. API Endpoints
- `GET /api/v1/billing/insurance/claims`: Active cashless claims queue (filters by TPA, status, pending queries).
- `POST /api/v1/billing/insurance/claims`: Register new insurance pre-authorization request (`CLM-YYYYMM-XXXXX`).
- `GET /api/v1/billing/insurance/claims/{id}/pre-auth`: Retrieve pre-auth details with current split.
- `PATCH /api/v1/billing/insurance/claims/{id}/pre-auth`: Update pre-auth status, record GOP approval, log notes and audit events.
- `GET /api/v1/billing/insurance/claims/{id}/dossier`: Fetch compiled claims packet.
- `POST /api/v1/billing/insurance/claims/{id}/dossier`: Compile digital claims pack (invoices, lab reports, diagnostics, financial breakdown).
- `POST /api/v1/billing/insurance/calculate-split`: Co-Pay vs Cashless Split calculator engine.
- `GET /api/v1/billing/insurance/payers`: List empanelled insurance providers and plan rules.
- `GET /api/v1/billing/corporate/accounts`: Corporate client registry with credit limit utilization meters and receivables aging.
- `GET /api/v1/billing/corporate/vouchers`: List corporate credit authorization vouchers.
- `POST /api/v1/billing/corporate/vouchers`: Issue new corporate credit voucher.
- `POST /api/v1/billing/corporate/vouchers/verify`: Validate employee entitlement voucher at registration and check credit headroom.

#### 4. Services/Business Logic
- [TPACorporateBillingService](file:///d:/North-Hospital/backend/apps/billing/services.py):
  - `calculate_copay_split`: Mathematical invariant engine: `Insurer Cashless + Patient Co-Pay == Total Bill`. Admissible amount excludes non-medical deductibles and room rent excess. Insurer pays `min(Admissible - CoPay, Approved GOP)`; shortfall automatically shifts to Patient Co-Pay.
  - `check_corporate_credit_availability`: Checks corporate credit headroom. Raises `CorporateCreditLimitExceeded` and logs `CREDIT_CAP_BLOCKED` audit event when limit breached.
  - `record_corporate_credit_charge`: Atomically commits corporate credit charges.
  - `register_pre_auth`: Sequences `CLM-YYYYMM-XXXXX` pre-auth records and timestamps audit notes.
  - `update_pre_auth`: Updates pre-auth status, GOP approved amounts, records timeline notes, and logs `GOP_APPROVED` / `CLAIM_DENIED` audit events.
  - `compile_claim_dossier`: Aggregates itemized bills, lab orders, prescriptions, and clinical summaries into a submission-ready dossier.
  - `verify_corporate_voucher`: Validates expiration dates, employee eligibility, ceiling, and corporate headroom.
  - `issue_corporate_voucher`: Issues sequenced employee vouchers.
  - `seed_default_payers_and_mous`: Pre-populates Star Health, HDFC ERGO, Care Insurance, CGHS, Infosys, and ONGC.

#### 5. Role Permissions
- [IsInsuranceCoordinatorOrAbove](file:///d:/North-Hospital/backend/apps/billing/permissions.py): Grants access to `INSURANCE_COORDINATOR`, `BILLING_MANAGER`, `BILLING_SUPERVISOR`, `DIRECTOR`, `HOD`, and superusers.

#### 6. Events/Integrations with Other Departments
- **GOP Approved Event (`GOP_APPROVED`)**: Logs GOP letter recording and pre-auth approval across audit stream.
- **Credit Cap Blocked Event (`CREDIT_CAP_BLOCKED`)**: Emitted when over-limit corporate billing attempts occur.
- **Voucher Verified Event (`VOUCHER_VERIFIED`)**: Emitted when counter validates corporate voucher.

#### 7. Frontend Screens Involved
- [Insurance & TPA Screen](file:///d:/North-Hospital/frontend/src/pages/billing/admin/InsuranceTpaScreen.tsx) (`/billing/admin/insurance` - A-07):
  - 4 KPI cards: Open pre-auths, Queries to answer, Approved value, Approval gap.
  - Pre-auth tracking queue with filter tabs (`Open`, `Query raised`, `Approved`, `Rejected`, `All`).
  - Slide-in `PreAuthUpdateDrawer`: Status selector, Approved GOP amount, notes timeline, and audit logging.
  - Contracts & Plans viewer: Payer list, tariff schedules, claim TAT, available plans table, and required documents.
  - Built-in **Co-Pay Split Sandbox Drawer**: Real-time simulation of insurer share vs patient co-pay.
  - Add Plan drawer modal.
- [Corporate Management Screen](file:///d:/North-Hospital/frontend/src/pages/billing/admin/CorporateScreen.tsx) (`/billing/admin/corporate` - A-08):
  - Receivables Aging Buckets: 0–30, 31–60, 61–90, 90+ days cards with account counts and visual utilization bars.
  - Corporate Receivables table with utilization percentages, status badges, and contract shortcuts.
  - Contracts & MOUs viewer: 4 KPI cards (Active MOUs, Credit extended, Near limit, Renewals in 30 days), employer selector, commercial terms editor (Credit limit, Tariff discount %, Billing cycle, Covered services, Signatories), Suspend/Reactivate, and Renew actions.
  - Slide-in **Corporate Credit Voucher Verification Drawer**: Validates voucher codes against corporate credit headroom and employee ceilings.
- [BillingAdminWorkspace.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/admin/BillingAdminWorkspace.tsx): Integrated navigation tabs and routes.

#### 8. Tests Required & Results
- [Phase8TPACorporateTestCase](file:///d:/North-Hospital/backend/apps/billing/tests.py) (8 tests added):
  - `test_copay_split_calculation_engine_math_invariant`: Passed.
  - `test_copay_split_endpoint`: Passed.
  - `test_corporate_credit_limit_check_and_block`: Passed.
  - `test_corporate_credit_charge_commit`: Passed.
  - `test_pre_auth_registration_and_update_lifecycle`: Passed.
  - `test_claim_dossier_compilation`: Passed.
  - `test_corporate_voucher_issuance_and_verification`: Passed.
  - `test_insurance_and_corporate_overview_apis`: Passed.
- Full Billing Suite: **114 / 114 tests passed (100% pass rate)**.
- Frontend Build: `npm run build` passed with 0 TypeScript errors.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing Backend), Phase 6 (Tariffs & Pricing), Phase 7 (Admin Governance).

---

### Phase 9 — IPD Billing & Discharge Clearance [COMPLETED]

#### 1. Existing Models/Components Reused
- [InpatientAdmission](file:///d:/North-Hospital/backend/apps/ipd/models.py#L14-L35) (`apps.ipd.models.InpatientAdmission`)
- [FinancialDischargeClearance](file:///d:/North-Hospital/backend/apps/billing/models.py#L338-L362) (`apps.billing.models.FinancialDischargeClearance`)
- `Invoice`, `PatientDeposit`, `Payment`, `Bed`, `TariffMaster`

#### 2. New Database Models & Schema Extensions
- `IPDRunningLedger`: Itemized real-time daily charge ledger for admitted patients.
  - Fields: `id`, `admission` (FK `InpatientAdmission`), `date`, `item_type` (`BED_TARIFF`, `NURSING_CARE`, `RESIDENT_ROUNDS`, `OT_PROCEDURE`, `LAB_TEST`, `PHARMACY_ISSUE`), `service_code`, `description`, `amount`, `is_interim_billed`, `created_at`.
- `InterimDepositDemand`: High-balance alert notices issued to patient attendants.
  - Fields: `admission` (FK), `demand_number` (`DM-YYYYMM-XXXXX`), `running_total`, `deposit_balance`, `demanded_amount`, `issued_at`, `status` (`PENDING`, `PAID`, `WAIVED`), `notes`.
- `FinancialDischargeClearance` enhancements:
  - Added `override_reason` (text, audited supervisor override), `checklist_confirmed` (boolean dictionary for pharmacy returns, lab verification, clinical sign-off, ward clearance), nullable `final_invoice`, and status `OVERRIDDEN`.
- Added audit event types: `DAILY_TARIFF_ACCRUED`, `INTERIM_DEMAND_ISSUED`, `DISCHARGE_CLEARED`, `DISCHARGE_GATE_VERIFIED`.

#### 3. API Endpoints
- `GET /api/v1/billing/ipd/admissions/`: Overview of all IPD admissions with live ledger total, deposits held, utilization % (alert at ≥80%), and clearance status.
- `GET /api/v1/billing/ipd/admissions/{id}/running-bill/`: Real-time aggregated running bill with category breakdown, ledger entries, deposit utilization, checklist state, and clearance status.
- `POST /api/v1/billing/ipd/admissions/{id}/charges/add/`: Add ad-hoc clinical or ward charge directly to running ledger.
- `POST /api/v1/billing/ipd/admissions/{id}/checklist/update/`: Toggle discharge checklist items (pharmacy returns, nursing consumables, lab releases, etc.).
- `POST /api/v1/billing/ipd/cron/accrue-daily-tariffs/`: Idempotent midnight cron job accruing bed rent and nursing tariffs for all active admissions.
- `POST /api/v1/billing/ipd/interim-demand/`: Issue interim deposit demand letter when running charges exceed deposit threshold.
- `POST /api/v1/billing/ipd/final-bill/consolidate/`: Consolidate running bill, adjust admission deposits, compute net balance, and generate final IPD invoice.
- `POST /api/v1/billing/ipd/discharge-clearance/issue/`: **Financial Discharge Clearance Gate** — strictly enforces ₹0.00 zero-balance invariant; generates QR-coded pass token or requires audited supervisor override.
- `GET /api/v1/billing/ipd/discharge-clearance/{token}/verify/`: Hospital security and ward gate verification endpoint with live status.

#### 4. Services/Business Logic
- `IPDRunningLedgerService`:
  - `accrue_daily_bed_tariffs(target_date)`: Midnight cron scanning active admissions, matching ward/bed types against tariff masters, avoiding duplicate accruals.
  - `get_running_bill_summary(admission_id)`: Aggregates ledger by category (`BED_TARIFF`, `NURSING_CARE`, etc.), computes total charges, active deposits held, deposit utilization %, and net remaining balance.
  - `issue_interim_demand(admission_id, demand_amount, notes)`: Flags attendant, creates demand record with sequential `DM-YYYYMM-XXXXX` identifier.
  - `consolidate_final_discharge_bill(admission_id, cashier)`: Gathers unbilled ledger items, auto-applies patient deposits held, creates final IPD invoice, marks ledger items as billed.
  - `issue_financial_discharge_clearance(admission_id, cashier, override_reason)`: **Hard Financial Discharge Clearance Gate** — verifies `net_balance <= 0.00`. If balance > 0 and no supervisor override (minimum 5 chars) is supplied, rejects with HTTP 400 (`gate_blocked: True`). Upon release, generates unique pass token `FDP-YYYYMM-XXXXX` and emits audit log.
  - `verify_discharge_clearance_token(token)`: Read-only verification for security gate and ward nurses.

#### 5. Role Permissions
- Cashier / Billing Executive / TPA Officer: Access running ledger, consolidate bills, issue clearance passes, trigger interim deposit notices.
- Billing Supervisor / Admin: Authorized to provide override reason for disputed or emergency releases.
- Ward Nurse & Hospital Security: Read-only token verification gate (`/ipd/discharge-clearance/{token}/verify/`).
- Hard invariant: Discharge clearance strictly blocked if patient has any outstanding balance, unless audited supervisor override reason is provided.

#### 6. Events/Integrations with Other Departments
- **Medical Discharge Initiated**: Doctor triggers medical discharge -> admission transitions to `DISCHARGE_INITIATED` -> Billing executive consolidates final bill.
- **Financial Clearance Released**: Generates QR-coded pass `FDP-*` -> unlocks nursing discharge and security gate exit.

#### 7. Frontend Screens Involved
- [IPD Running Bills Screen](file:///d:/North-Hospital/frontend/src/pages/billing/executive/IpdRunningBillsScreen.tsx) (`/billing/ipd` - E-04):
  - 5 KPI summary cards: Admitted Patients, Over 80% Deposit, Discharge Today, Awaiting TPA, Total Deposits Held.
  - Real-time IPD Admissions table with search, ward filter, live ledger total vs deposits cover progress meter, and status badges.
  - Selected inpatient detail drawer/split:
    - Running charges categorized breakdown (Room & Bed, Nursing, Doctor Rounds, Procedures, Pharmacy, Labs).
    - Recent ledger entries with timestamps and charge types.
    - Quick action to manually post ward running charge.
    - Deposit utilization alert banner with "Issue Demand" top-up trigger.
    - Discharge Checklist interactive toggles (Pharmacy returns verified, nursing consumables returned, unbilled lab slips reconciled, medical discharge signed).
    - Bill Consolidation trigger converting ledger to final IPD invoice.
    - Financial Discharge Clearance action with automated zero-balance verification and Supervisor Override modal dialog.
- [Discharge Clearance Pass Modal](file:///d:/North-Hospital/frontend/src/pages/billing/executive/DischargeClearancePassModal.tsx):
  - Printable QR-code clearance pass slip showing pass number, admission ID, patient UHID & name, bed/ward, zero balance verification stamp, and security instructions.
- [BillingExecutiveWorkspace.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/executive/BillingExecutiveWorkspace.tsx):
  - Added `IPD Running Bills` navigation tab (`<BedDouble size={16} />`) and mounted route at `/billing/ipd`.
  - Deposit top-up shortcut seamlessly opens `PatientBillingDrawer` with active counter context.

#### 8. Tests Required & Results
- [Phase9IPDBillingTestCase](file:///d:/North-Hospital/backend/apps/billing/tests.py) (8 tests added):
  - `test_midnight_bed_and_nursing_tariff_accrual_idempotent`: Passed.
  - `test_running_bill_summary_and_deposit_utilization_alert`: Passed.
  - `test_issue_interim_demand`: Passed.
  - `test_financial_discharge_clearance_blocked_when_balance_outstanding`: Passed.
  - `test_financial_discharge_clearance_with_supervisor_override`: Passed.
  - `test_financial_discharge_clearance_success_after_full_settlement`: Passed.
  - `test_discharge_clearance_security_gate_verification`: Passed.
  - `test_ipd_admissions_overview_and_consolidation_api`: Passed.
- Full Billing Suite: **122 / 122 tests passed (100% pass rate)**.
- Frontend Build: `npm run build` passed with 0 TypeScript/compilation errors.
- Knowledge Graph: `graphify update .` completed successfully.

#### 9. Dependencies on Previous Phases
- Phase 1 (Core Billing), Phase 2 (Department Charge Integration), Phase 4 (Counter Shift), Phase 8 (Insurance / TPA).

---

### Phase 10 — Revenue Integrity & Governance [COMPLETED]

#### 1. Existing Models/Components Reused
- `Invoice`, `InvoiceItem`, `BillableChargeItem`, `RefundRequest`, `CounterShift`, `FinancialDischargeClearance`, `BillingAuditEvent`
- `InpatientAdmission` (`apps.ipd.models.InpatientAdmission`), `Patient` (`apps.patients.models.Patient`), `User` (`apps.accounts.models.User`)

#### 2. New Database Models & Schema Extensions
- `RevenueLeakageAlert`: Flagged unbilled clinical events, missed charges, or orphaned discharge items.
  - Fields: `id`, `leakage_type` (`UNBILLED_ORDER`, `DISCHARGED_NOT_BILLED`, `PACKAGE_OVERRUN`, `EXCESSIVE_DISCOUNT`, `EXCESSIVE_REFUND`, `MISSING_CHARGE`), `department`, `patient` (FK), `estimated_amount`, `risk_score` (1-100), `status` (`DETECTED`, `ASSIGNED`, `CONVERTED`, `DISMISSED`, `INVESTIGATING`), `source_event_type`, `source_event_reference`, `description`, `assigned_to` (FK User nullable), `converted_charge_item` (FK BillableChargeItem nullable), `dismissed_reason`, `dismissed_by` (FK User nullable), `detected_at`, `resolved_at`, `metadata`.
- `FraudRiskSignal`: Abnormal behavioral patterns detected across cashiers, counters, discounts, and refunds.
  - Fields: `id`, `signal_code` (`SIG-DISC-CLUST`, `SIG-REFUND-FREQ`, `SIG-VOID-RATE`), `signal_type` (`DISCOUNT_CLUSTERING`, `FREQUENT_REFUNDS`, `EXCESSIVE_VOIDS`), `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `description`, `flagged_user` (FK User nullable), `flagged_counter` (FK BillingCounter nullable), `occurrences_count_30d`, `confidence_score` (1-100), `evidence_data`, `is_acknowledged`, `acknowledged_by` (FK User nullable), `acknowledged_at`, `detected_at`.
- `RevenueInvestigationCase`: Formal investigation docket for compliance officers and internal auditors.
  - Fields: `case_number` (`INV-CASE-YYYYMM-XXXXX`), `subject`, `leakage_alert` (FK nullable), `risk_signal` (FK nullable), `assigned_investigator` (FK User nullable), `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), `findings`, `recovered_amount`, `created_at`, `updated_at`, `resolved_at`.
- Role & Permissions Extension:
  - Added `INTERNAL_AUDITOR` to `RoleType` in `accounts` and frontend types.
  - Added `RoleType.INTERNAL_AUDITOR` to `READ_ONLY_BILLING_ROLES` in `billing/permissions.py`.
- New `BillingAuditEventType` entries: `REVENUE_LEAKAGE`, `LEAKAGE_RECOVERED`, `LEAKAGE_DISMISSED`, `FRAUD_SIGNAL`, `INVESTIGATION_EVENT`.

#### 3. API Endpoints
- `GET /api/v1/billing/integrity/overview/`: Consolidated KPIs (amount at risk, open leakages, high risk signals, open investigations, recovered MTD) and active recent lists.
- `GET /api/v1/billing/integrity/leakages/`: Filterable stream of revenue leakage items (by status, department, leakage type, search).
- `POST /api/v1/billing/integrity/leakages/scan/`: Trigger automated leakage scanner (catches unbilled orders > 24h, discharged patients unbilled > 2h).
- `POST /api/v1/billing/integrity/leakages/{id}/convert-charge/`: Convert verified leakage alert into an active `BillableChargeItem` in the patient's billing queue.
- `POST /api/v1/billing/integrity/leakages/{id}/dismiss/`: Dismiss alert as false positive with mandatory justification (≥ 5 chars).
- `POST /api/v1/billing/integrity/leakages/{id}/assign/`: Assign alert to billing manager/officer.
- `GET /api/v1/billing/integrity/risk-signals/`: Stream of behavioral anomaly signals (filterable by severity and acknowledgement).
- `POST /api/v1/billing/integrity/risk-signals/scan/`: Trigger cashier fraud anomaly scanner (3+ refunds in shift, discount clustering, excessive voids).
- `POST /api/v1/billing/integrity/risk-signals/{id}/acknowledge/`: Acknowledge and timestamp risk signal.
- `GET /api/v1/billing/integrity/investigations/`: List and search open compliance dockets.
- `POST /api/v1/billing/integrity/investigations/`: Open new official investigation case docket (`INV-CASE-YYYYMM-XXXXX`).
- `GET /api/v1/billing/integrity/investigations/{id}/`: Detail view of investigation docket.
- `POST /api/v1/billing/integrity/investigations/{id}/update/`: Update case status, record investigative findings, and log recovered revenue amount.

#### 4. Services/Business Logic
- `RevenueIntegrityScannerService`:
  - `scan_revenue_leakage()`: Automated scanner checking unbilled department charge items > 24 hours and discharged IPD admissions unbilled > 2 hours. Computes composite risk scores (`0-100`) based on financial exposure and elapsed age.
  - `scan_fraud_risk_signals()`: Analyzes cashier and counter shift behavioral patterns:
    1. Cashiers executing ≥ 3 refunds within a single shift / 24-hour window (`SIG-REFUND-FREQ`).
    2. Repeated discounts clustered within 1% below supervisor threshold (e.g. 4.0% - 4.99%) without approval (`SIG-DISC-CLUST`).
    3. Shift voids exceeding 2x the average counter baseline (`SIG-VOID-RATE`).
  - `convert_leakage_to_charge(alert_id, user)`: Generates active `BillableChargeItem` for patient, links charge item, sets status to `CONVERTED`, logs `LEAKAGE_RECOVERED` audit event.
  - `dismiss_leakage_alert(alert_id, reason, user)`: Enforces mandatory minimum 5 characters reason, sets status to `DISMISSED`, logs `LEAKAGE_DISMISSED` audit event.
  - `open_investigation_case(user, subject, alert_id, signal_id, findings)`: Creates docket with sequential identifier `INV-CASE-YYYYMM-XXXXX`, transitions linked alert to `INVESTIGATING`.
  - `update_investigation_case(case_id, user, status, findings, recovered_amount)`: Modifies docket, updates recovered amount, closes or resolves with audit trail.
  - `get_revenue_integrity_overview()`: Live calculation of 5 core KPIs: `amount_at_risk`, `open_leakage_items`, `high_risk_signals`, `investigations_open`, `recovered_mtd`.

#### 5. Role Permissions
- `Role: BILLING_ADMIN`, `BILLING_MANAGER`: Full management, scanning, converting charges, dismissing alerts, opening and resolving investigations.
- `Role: INTERNAL_AUDITOR`: Read-only access across all revenue integrity dashboards and dockets with explicit audit visibility.
- Actions hidden (not just disabled) for unauthorized roles as specified in the Bible architecture.

#### 6. Events/Integrations with Other Departments
- **Charge Conversion**: Seamlessly injects `BillableChargeItem` into the owning department's active billing flow.
- **Audit Logging**: Emits `REVENUE_LEAKAGE`, `LEAKAGE_RECOVERED`, `LEAKAGE_DISMISSED`, `FRAUD_SIGNAL`, and `INVESTIGATION_EVENT` into hospital-wide `BillingAuditEvent` stream.

#### 7. Frontend Screens Involved
- [Revenue Integrity Screen](file:///d:/North-Hospital/frontend/src/pages/billing/admin/RevenueIntegrityScreen.tsx) (`/billing/admin/integrity` - A-03):
  - 5 KPI summary cards: `Amount at risk`, `Open leakage items`, `High-risk signals`, `Investigations open`, `Recovered MTD`.
  - Header actions: `Run Leakage Scanner`, `Run Fraud Detector`, `Refresh`.
  - 3 Work tabs:
    - Tab 1 (`Leakage Queue`): Filters for status, department, and search. Table with type badge, department, patient, source event, estimated amount, risk score pill, status badge, detected date, and inline actions ("Convert Charge", "Dismiss", "Investigate").
    - Tab 2 (`Risk Signals`): Filters for severity and acknowledgement. Grid of signal cards showing signal code, severity badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), cashier/counter, 30-day occurrence frequency, model confidence %, "Acknowledge" button, and "Open Docket" button.
    - Tab 3 (`Investigations`): Searchable dockets table (`INV-CASE-YYYYMM-XXXXX`), subject, investigator, status badge, recovered amount, created timestamp, and "Manage Docket" drawer action.
  - Modals & Drawers:
    - Dismiss Modal: Requires mandatory reason (minimum 5 chars) with instant validation.
    - Open Investigation Modal: Pre-populates subject and context from alerts or signals.
    - Manage Docket Drawer: Edit findings, update status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), and enter recovered revenue amount.
- [BillingAdminWorkspace.tsx](file:///d:/North-Hospital/frontend/src/pages/billing/admin/BillingAdminWorkspace.tsx):
  - Mounted `Revenue Integrity` navigation tab with `<ShieldAlert size={16} />` icon at `/billing/admin/integrity`.
- [AppLayout.tsx](file:///d:/North-Hospital/frontend/src/components/layout/AppLayout.tsx):
  - Added `INTERNAL_AUDITOR` to role routing, landing directly on `/billing/admin/integrity`.

#### 8. Tests Required & Results
- [Phase10RevenueIntegrityTestCase](file:///d:/North-Hospital/backend/apps/billing/tests.py) (8 tests added):
  - `test_unbilled_order_leakage_detection`: Passed.
  - `test_discharged_not_billed_leakage_detection`: Passed.
  - `test_convert_leakage_to_charge`: Passed.
  - `test_dismiss_leakage_with_validation`: Passed.
  - `test_fraud_detection_frequent_refunds`: Passed.
  - `test_fraud_detection_discount_clustering`: Passed.
  - `test_open_and_update_investigation_case`: Passed.
  - `test_revenue_integrity_overview_kpis`: Passed.
- Full Billing Suite: **130 / 130 tests passed (100% pass rate)**.
- Frontend Build: `npm run build` passed with 0 TypeScript/compilation errors.
- Knowledge Graph: `graphify update .` completed successfully (AST extraction 100%, graph updated).

#### 9. Dependencies on Previous Phases
- Phase 2 (Department Charge Integration), Phase 4 (Counter Shift & Cashier Math), Phase 5 (Supervisor & Refunds), Phase 9 (IPD Billing & Discharge).

---

### Phase 11 — Reports & Audit `[COMPLETED]`

*Implementation notes:*
- *Models (migration `0016`): `FinancialPeriodLock` (DAILY / MONTHLY / ANNUAL — the spec adds day close to the plan's month/year; statuses OPEN, PRE_CLOSE_AUDIT, LOCKED, REOPENED; totals, checklist snapshot, carry-forward note, frozen ERP journal + `JV-` reference, reopen request/approval/expiry) and `DailyRevenueSnapshot` (department rows with tender `ALL`, tender rows with department `ALL`; final rows are written at day close and read instead of re-aggregating). `BillingAuditEvent` gains an append-only SHA-256 hash chain (`sequence`, `prev_hash`, `entry_hash`; existing rows sealed by the migration); entries can only receive a review stamp and cannot be deleted.*
- *Period lock enforcement (model `save()` guards rather than database triggers): new invoices, payments, deposits and credit notes dated in a LOCKED period, edits to a locked invoice's ledger fields (amounts, number, date, patient), voiding it, changing its lines, or editing a locked payment/credit note raise `FinancialPeriodLocked` → `403 Financial Period Locked` via the DRF exception handler, which also writes an Access audit entry. Settling an old invoice today is a current-period transaction and stays allowed. Queryset `.update()` bypasses the guard by design (used only by system jobs).*
- *Close workflow (A-13): checklist — period ended, all shifts closed & signed off, signed-off cash in the vault, no pending/approved-unpaid refunds, unbilled items >24h and open leakage alerts resolved or carried forward with a reason, drafts (advisory), month: every day closed + GST reconciles, year: every month closed, settlement journal balances. Roles: day = Billing Manager/Admin, month = Billing Admin/Finance, year = Finance (CFO) — the plan's `FINANCE_CFO` maps to `FINANCE_MANAGER`. Reopen needs a reason, CFO approval by someone other than the requester, is time-boxed (24h default, max 72h) and relocks automatically; a day inside a closed month cannot be reopened before the month.*
- *`BillingReportingService`: revenue analytics (net revenue vs last year, collection efficiency = collected ÷ billed, payer mix, discount/refund/leakage % of gross, 12-month trend with run-rate projection, departments, insurer days-to-pay & denial rate), daily collections (tender × cashier), department revenue (item-level, invoice discount spread by line share), GST by rate slab with CGST/SGST/IGST and credit-note reversals in the original period (reconciled against invoice tax), GSTR-1 / GSTR-3B / rate summaries, AR aging by payer (self pay / corporate / insurance; 0-30, 31-60, 61-90, 90+), cashier productivity (turnaround vs 10-min SLA, drawer variance), refunds, discounts, and a balanced settlement journal (receivables/revenue/GST, tenders, deposits, refunds) — the Period Close ERP feed.*
- *Endpoints: `GET /reports/revenue-analytics/`, `/reports/daily-collections/`, `/reports/department-revenue/`, `/reports/tax-gst/` (`?month=` adds returns), `/reports/aging-ar/`, `/reports/cashier-productivity/`, `/reports/catalogue/`, `/reports/run/{key}/` (`?export=csv`), `POST /reports/journal/post/`, `GET/POST /period-close/`, `POST /period-close/{id}/reopen-request|reopen-decision|relock/`, `GET /period-close/{id}/journal/` (`?export=csv`), `GET /audit-logs/` (category, search, user, reference, dates, `?export=csv`), `GET /audit-logs/verify/`. Exports are audited.*
- *Access: Billing Admin/Manager, Finance (CFO) and Internal Auditor read reports, tax and audit logs (auditor strictly read-only); Billing Supervisors get today's shift reports only (collections by tender, cashier productivity, refunds), enforced server-side.*
- *Frontend: `/billing/finance` workspace (Finance Manager and Internal Auditor now land here) and the same screens in the Billing Admin workspace — Revenue Analytics (A-02, table view + print to PDF), Reports hub (A-20, catalogue, period tabs, lock state, CSV/Excel, PDF via print, Post to ERP), Tax & GST (A-17, slabs, credit-note adjustments, GSTR JSON), Period Close (A-13, day strip, checklist, month/year close, reopen flow, ERP journal export), Audit Log (A-21, categories, search, filters, export, tamper check). Supervisor workspace gains Shift Reports.*
- *Also fixed: Phase 7 Revenue Command crashed with unbilled charges (`total_price` → `total_amount`) and on aging (string date arithmetic).*
- *Deferred: SAC/HSN code mapping per tariff (needs a tariff field; the GST report groups by rate slab), scheduled report e-mails, signed-PDF export (browser print is used), direct ERP connectors (the journal is exported as CSV/JSON feed), department reconciliation sign-off in the day checklist (no reconciliation records exist yet).*

#### 1. Existing Models/Components Reused
- All Billing models (`Invoice`, `InvoiceItem`, `Payment`, `PatientDeposit`, `RefundRequest`, `CounterShift`, `TPAClaimRecord`, `RevenueLeakageAlert`)

#### 2. New Database Models
- `FinancialPeriodLock`: Immutable monthly and annual accounting period locks.
  - Fields: `id`, `period_name` (`October 2026`), `period_type` (`MONTHLY`, `ANNUAL`), `start_date`, `end_date`, `status` (`OPEN`, `PRE_CLOSE_AUDIT`, `LOCKED`), `closed_by` (FK User nullable), `closed_at` (DateTimeField nullable), `total_gross_billed`, `total_collected`, `total_refunded`, `total_outstanding`.
- `DailyRevenueSnapshot`: Pre-aggregated nightly summary table for instant reporting performance.
  - Fields: `snapshot_date`, `department`, `tender_mode`, `gross_revenue`, `discounts`, `net_revenue`, `taxes_collected`, `refunds`.

#### 3. API Endpoints
- `GET /api/v1/billing/reports/revenue-analytics/`: Macro financial trajectories (MTD, YTD, payer mix, collection efficiency).
- `GET /api/v1/billing/reports/daily-collections/`: Cashier and payment mode breakdown.
- `GET /api/v1/billing/reports/department-revenue/`: Revenue attribution by clinical department (OPD, Lab, Pharmacy, IPD, OT).
- `GET /api/v1/billing/reports/tax-gst/`: GST compliance report (CGST, SGST, IGST taxable values).
- `GET /api/v1/billing/reports/aging-ar/`: Accounts receivable aging buckets (0-30, 31-60, 61-90, 90+ days).
- `GET /api/v1/billing/reports/cashier-productivity/`: Turnaround SLA and invoice volume per cashier.
- `POST /api/v1/billing/period-close/`: Execute month-end financial period lock.
- `GET /api/v1/billing/audit-logs/`: Comprehensive tamper-proof log stream of all billing modifications.

#### 4. Services/Business Logic
- `BillingReportingService`:
  - High-performance aggregation pipeline utilizing `DailyRevenueSnapshot` for sub-second report generation.
  - AR Aging Calculator: categorizes pending balances across Corporate, TPA, and Patient self-pay buckets.
- `FinancialPeriodCloseService`:
  - Pre-close reconciliation verification (confirming zero open shifts, zero pending refunds).
  - Period Lock Enforcement: once a period is `LOCKED`, database triggers and service guards strictly forbid creating, editing, or voiding transactions dated within that period. Reopening requires `FINANCE_CFO` sanction.

#### 5. Role Permissions
- `Role: BILLING_ADMIN`, `FINANCE_CFO`: Full access to close periods and view hospital-wide tax reports.
- `Role: INTERNAL_AUDITOR`: Read-only access to all audit logs, reports, and period closing states.
- `Role: BILLING_SUPERVISOR`: Read-only access restricted to current shift reports.

#### 6. Events/Integrations with Other Departments
- **Period Close Event**: Emits reconciliation journal feed for export to hospital accounting/ERP suites (Tally, SAP, Oracle Financials).

#### 7. Frontend Screens Involved
- [Revenue Analytics Screen](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html#A-02) (A-02): Trend charts, payer mix, collection efficiency.
- [Reports Hub](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html#A-20) (A-20): Tabular reports with date picker and PDF/Excel export.
- [Tax & GST Tab](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html#A-17) (A-17): GST tax filing summaries.
- [Period Close Screen](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html#A-13) (A-13): 6-step month-end closing wizard.
- [Audit Log Stream](file:///d:/North-Hospital/Billing%20Department%20Specification/Billing%20Administration%20Architecture.dc.html#A-21) (A-21): Searchable compliance event log.

#### 8. Tests Required
- Period Lock Guard Test: Attempting to post an invoice or edit a payment in a closed period raises `403 Forbidden - Financial Period Locked`.
- GST Reporting Accuracy Test: Tax totals match exact mathematical sums of itemized invoice lines.
- Aging Bucket Classification Test: Invoices aged 45 days accurately fall into the 31-60 day bucket.

#### 9. Dependencies on Previous Phases
- All prior phases (Phases 1 through 10).
