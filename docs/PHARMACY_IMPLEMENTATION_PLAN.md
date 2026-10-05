# North Hospital HMS — Pharmacy 8-Phase Implementation Plan

**Document Version:** 1.0  
**Status:** Approved Roadmap for Execution  
**Architecture Reference:** `PHARMACY_ARCHITECTURE.md`, `PHARMACY_ERD_AND_EVENTS.md`, `PHARMACY_WORKFLOWS.md`, `PHARMACY_VISUAL_SPEC.md`, `PHARMACY_ROLES.md`  
**Rule:** No implementation code to be written until user sign-off.

---

## Executive Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 8 IMPLEMENTATION PHASES                                     │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ PHASE 1         │ PHASE 2         │ PHASE 3         │ PHASE 4         │ PHASE 5                 │
│ Database Models │ Inventory Mgr   │ Doctor -> Pharm │ OPD Pharmacist  │ Billing Integration     │
│ Django ORM &    │ Procurement, PR,│ Clinical Handoff│ Queue, FEFO, OTC│ 6 Settlement Engines    │
│ Serializers     │ PO, GRN Batches │ Read-Only Invar │ Returns Desk    │ Ledger Commits          │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ PHASE 6         │ PHASE 7         │ PHASE 8                                                     │
│ IPD Pharmacist  │ Controlled Drugs│ Pharmacy Admin                                              │
│ Ward Supply,    │ Narcotics, Vault│ Governance, PR Approvals, Reports,                          │
│ MAR & Adm Ledger│ Dual Sign-Off   │ Staff Shifts, Separation of Concerns                        │
└─────────────────┴─────────────────┴─────────────────────────────────────────────────────────────┘
```

---

# PHASE 1: Database Models, Migrations & Serializers

### Primary Objectives
Establish the persistent relational data layer in Django ORM and Django REST Framework serializers according to the verified ERD.

### Backend Tasks
1. **Initialize Django App:**
   - Create `backend/apps/pharmacy` module with proper `apps.py` configuration.
   - Register `'apps.pharmacy'` in `backend/core/settings.py` `INSTALLED_APPS`.
2. **Implement Core Models in `backend/apps/pharmacy/models/`:**
   - `PharmacyMedicine`: Formulary SKU, codes, strengths, prices, reorder thresholds, flags (`requires_prescription`, `is_high_risk`, `is_narcotic`), allergens `JSONField`.
   - `PharmacySupplier`: Wholesale vendor directory, drug license, GST tax #, payment terms Net-30/60.
   - `PharmacyPurchaseRequest` & `PharmacyPurchaseRequestItem`: Requisitions, priority, status enum, estimated costs.
   - `PharmacyPurchaseOrder` & `PharmacyPurchaseOrderItem`: Vendor orders, agreed pricing, expected delivery date.
   - `PharmacyBatch`: FEFO inventory, composite index on `[medicine, expiry_date, available_quantity]`, check constraints on quantities and expiry dates.
   - `PharmacyStockTransaction`: Append-only audit trail (`RECEIVE`, `DISPENSE`, `ISSUE`, `OTC`, `RETURN`, `ADJUST`).
   - `PharmacyDispenseOrder` & `PharmacyDispenseOrderItem`: Fulfillment head with the 6 settlement modes, co-pay fields, TPA codes, corporate references.
   - `PharmacyOTCSale` & `PharmacyOTCSaleItem`: Direct counter walk-in sales.
   - `PharmacyReturn` & `PharmacyReturnItem`: Returns with Restock vs Quarantine logic.
   - `PharmacyControlledDrugRegister`: Immutable statutory narcotic ledger with dual user keys.
3. **Database Migrations:**
   - Generate and execute migrations: `python manage.py makemigrations pharmacy && python manage.py migrate`.
4. **DRF Serializers in `backend/apps/pharmacy/serializers/`:**
   - Model serializers with field-level validators (e.g. stock non-negativity, expiry date validation, dual credential validation).
5. **Django Admin Registration:**
   - Register all models in `backend/apps/pharmacy/admin.py` with searchable filters and tabular inlines.

### Validation & Exit Criteria
- `python manage.py makemigrations --check` reports zero unapplied model changes.
- Automated model tests verify foreign key constraints, unique constraints, and check constraints.

---

# PHASE 2: Inventory Manager & Procurement Pipeline

### Primary Objectives
Build the complete stock supply chain, Purchase Requisition (PR) authoring, Goods Receipt Note (GRN) batch generation, FEFO rotation, and physical stock count reconciliation for `INVENTORY_MANAGER`.

### Backend Tasks
1. **Procurement Endpoints:**
   - `POST /api/v1/pharmacy/purchase-requests`: Inventory manager submits reorder request.
   - `GET /api/v1/pharmacy/purchase-requests`: Filterable by status (`SUBMITTED`, `APPROVED`, etc.).
   - `POST /api/v1/pharmacy/goods-receipt`: Posts inbound supplier deliveries against issued POs, creating new `PharmacyBatch` records.
   - `POST /api/v1/pharmacy/stock/adjust`: Records audit-logged physical stock corrections.
2. **Batch & Stock Calculation Services:**
   - Automated reorder level evaluator (generates recommended PR draft when stock < reorder threshold).
   - Automated batch status monitor (`ACTIVE`, `DEPLETED`, `EXPIRED`, `QUARANTINED`).

### Frontend Tasks
1. **Inventory Route & View (`/pharmacy?view=inventory`):**
   - KPI Cards: Low Stock SKUs, Expiring < 30 Days, Pending PRs, Active Batches, Daily Turnover.
   - Sub-Tabs: `[Stock Ledger]` | `[Purchase Requests]` | `[Purchase Orders]` | `[Suppliers]`.
2. **Drawers & Modals:**
   - `+ New Purchase Request` Modal: Select low-stock medicines, set priority, enter target quantities.
   - `Receive Stock (GRN)` Drawer: Input supplier invoice #, batch #, mfg date, expiry date, storage location.
   - `Stock Adjustment` Drawer: Document physical count discrepancies with required audit notes.
3. **State Store:**
   - Create `frontend/src/pages/pharmacy/pharmacyInventoryStore.ts`.

### Validation & Exit Criteria
- Inventory Manager can generate PRs, receive shipments against POs into new FEFO batches, and perform stock adjustments with complete transaction logging.

---

# PHASE 3: Doctor → Pharmacy Integration

### Primary Objectives
Connect clinical consultation prescribing (OPD) and inpatient doctor round prescribing (IPD) directly to the pharmacy queue with strict enforcement of the **Read-Only Invariant**.

### Backend Tasks
1. **Clinical Handoff Hooks:**
   - Connect Django signals on `clinical.Prescription` finalization: creates a pending `PharmacyDispenseOrder` queued for OPD review.
   - Connect Inpatient Ward Doctor orders: creates pending IPD ward medication requisition.
2. **Enforce Read-Only Rule:**
   - Ensure prescribing creates order headers only. **Zero mutation of `PharmacyBatch` stock and zero mutation of billing ledgers.**
3. **Allergy Cross-Reactivity Engine:**
   - Service to compare prescribed drug molecules against patient registered allergies in `patients.Patient`.
   - Returns structured conflict payload: allergen name, reaction severity, cross-reactivity warning.

### Frontend Tasks
1. **Clinical Rx Screen Handoff:**
   - Verify doctor prescription finalization modal emits correct pharmacy routing tags.
2. **Real-time Queue Listener:**
   - Pharmacy queue auto-refreshes when new clinical prescriptions are signed.

### Validation & Exit Criteria
- Creating an e-Prescription in the Doctor Workspace immediately enqueues it in the Pharmacy Queue while central stock and patient billing remain completely untouched.

---

# PHASE 4: OPD Pharmacist & Counter Operations

### Primary Objectives
Implement the complete outpatient prescription dispensing workflow, safety verification drawer, allergy override audits, quick OTC walk-in POS, and medication returns for `OPD_PHARMACIST`.

### Backend Tasks
1. **OPD Queue Endpoints:**
   - `GET /api/v1/pharmacy/dispense-queue?type=OPD`: Filter by `Pending`, `On Hold`, `Dispensed`.
   - `POST /api/v1/pharmacy/prescriptions/:id/claim`: Claims Rx into `UNDER_REVIEW`.
   - `POST /api/v1/pharmacy/prescriptions/:id/override-allergy`: Logs clinical justification.
2. **OTC & Return Endpoints:**
   - `POST /api/v1/pharmacy/otc/dispense`: Direct non-prescription sale.
   - `POST /api/v1/pharmacy/returns`: Inspects packaging, restocks or quarantines items, creates credit note.

### Frontend Tasks
1. **OPD Dispensing View (`/pharmacy?view=opd`):**
   - KPI Cards: Pending Verification, Awaiting Stock, Dispensed Today, Allergy Overrides.
   - Search & Filter bar (UHID, Patient Name, Rx #).
   - High-contrast table with 56px rows adhering to `hms-design-bible.md`.
2. **Prescription Detail Drawer (`580px` width):**
   - Patient demographics & interactive Allergy Banner (clean vs alert state).
   - Itemized medicine cards with dosage, regimen, and read-only FEFO batch preview.
   - Allergy Override Modal with mandatory justification text.
3. **Quick OTC Walk-in Sale Modal (`480px` width):**
   - Non-prescription drug selector, cash/card/UPI toggle, thermal receipt preview.
4. **Process Return Drawer (`540px` width):**
   - Packaging inspection checklist, restock/quarantine selector.
5. **State Store:**
   - Create `frontend/src/pages/pharmacy/opdPharmacistStore.ts`.

### Validation & Exit Criteria
- OPD Pharmacist can verify prescriptions, review allergy alerts, execute OTC walk-ins, and process returns.

---

# PHASE 5: Billing Integration & The 6 Settlement Engines — [COMPLETED]

### Primary Objectives
Implement the core financial settlement engine, wiring every dispense transaction to its exact billing target across the 6 supported settlement modes.

### Status: COMPLETED
- **Backend Service:** `backend/apps/pharmacy/services.py` -> `PharmacyBillingSettlementService`
  - Mode 1 (`PAY_AT_PHARMACY`): Cash tender calculation with change due, POS Card auth reference, dynamic UPI QR. Creates finalized `Invoice` (`category: PHARMACY`, `status: PAID`) + `Payment` record; credits active counter shift drawer.
  - Mode 2 (`PAY_AT_RECEPTION`): Appends unbilled items to visit invoice (`status: UNPAID`), generates scannable barcode token slip (`PH-8821`), supports Pre-Paid Hold vs Post-Paid Handover policies, listens for cashier clearance webhook (`POST /api/v1/pharmacy/billing/reception-webhook/`).
  - Mode 3 (`INSURANCE`): TPA directory provider, institutional contract tariff rates, automated Co-Pay Split (admissible cover % vs patient co-pay), books `INSURANCE_PENDING` receivable, generates Insurance Dispense Certificate.
  - Mode 4 (`CORPORATE`): Empanelled corporate accounts (Indian Railways, CGHS, TechM, etc.), schedule discount (10-20%), employee badge ID, authorization letter reference, digital voucher, books `CORPORATE_PENDING`.
  - Mode 5 (`CREDIT`): Staff allowance / VIP courtesy line / Emergency ER indigent fund, credit limit check, MS/CFO dual-sign authorization PIN (`4412`), justification note, books `CREDIT_AUTHORIZED`, zero cash collected.
  - Mode 6 (`IPD_RUNNING_BILL`): Inpatient admission folio, ward/bed bound, advance deposit balance utilization check (>80% warning alert), appends to active admission ledger, flips Nurse MAR state to `READY_TO_ADMINISTER`.
  - Shift Drawer Accounting: Active counter shift model (`PharmacyCounterShift`), opening float ₹2,000, revenue collections by tender (Cash, Card, UPI), net drawer cash, shift reconciliation & closure endpoint (`GET/POST /api/v1/pharmacy/billing/shift-drawer/`).
- **Batch Deduction on Settle:**
  - Atomically decrements `available_quantity` from allocated `PharmacyBatch` records and writes `PharmacyStockTransaction`.
- **Frontend UI & Components:**
  - `frontend/src/services/pharmacyOpdService.ts`: Typed interfaces and service calls for directories, drawer, webhook, and settlement payload.
  - `frontend/src/pages/pharmacy/opd/OPDPharmacistWorkspace.tsx`:
    * Step 3: Interactive 6-settlement selector pills with dynamic breakdown calculations.
    * Step 4: Adaptive sub-panels (Cash change calculator, Card POS, UPI QR, Reception token slip with Policy A/B and webhook simulator, TPA co-pay split card, Corporate badge/voucher, Credit PIN authorization `4412`, IPD deposit utilization gauge).
    * Shift Drawer modal: Displays drawer float, revenue by tender, net cash, and closure reconciliation.
    * Statutory Receipt Modal: Full print-ready invoice with GSTIN, Drug License numbers, line items with Batch/Expiry/HSN/Tax, financial breakdown, and pharmacist signature.
- **Automated Tests:**
  - 31 out of 31 test cases in `apps.pharmacy` passing with 0 failures, 0 errors, validating all 6 engines, FEFO stock deductions, PIN checks, shift drawer, and clearance webhook.

---

# PHASE 6: IPD Pharmacist & Inpatient Ward Supply — [COMPLETED]

### Primary Objectives
Build ward medication requisition fulfillment, unit-dose picking, ward issue drawer, Nurse MAR status synchronization, and real-time Inpatient Admission running ledger updates for `IPD_PHARMACIST`.

### Status: COMPLETED
- **Design Mockup Alignment:**
  - Built strictly per specifications in `Pharmacy Department UI Specification/IPD Pharmacist Workspace.dc.html`, `PHARMACY_UI_SPEC.md`, and design addenda.
- **Backend Architecture & Services:**
  - **Models & Migrations:** Updated `PharmacyDispenseOrder` with `bed_number`, `nurse_name`, `is_emergency`, `emergency_reason`, `is_cancelled`, `cancellation_reason`, `received_by_nurse`, `received_at`; updated `PharmacyReturn` with `admission`, `ward_name`, `bed_number`, `nurse_name`, `item_type`, `notes`, `processed_by`. Applied migration `0007_pharmacydispenseorder_bed_number_and_more.py`.
  - **Service (`PharmacyIPDService` in `backend/apps/pharmacy/services.py`):**
    - `get_ipd_queue(tab, ward, search)`: Returns ward requests with wait times, allergy alerts, FEFO batch allocations, shortage flags, and 4-point MAR validation.
    - `get_ipd_kpis()`: Aggregates the 5 live operational KPIs (Open requests, Pending issues, Issued today, Emergency requests, Ward returns).
    - `issue_to_ward(order_id, user, data)`: Atomic transaction executing FEFO batch stock decrement (`ISSUE_IPD`), admission ledger commit (`billing.Invoice` category `PHARMACY`, settlement mode `IPD_RUNNING_BILL`, status `PAID`), MAR synchronization (`MedicationAdministration` to `READY_TO_ADMINISTER` / `ISSUED`), CD register entry, and handover tracking.
    - `emergency_release(order_id, user, data)`: Rapid STAT issue with retrospective review audit within 24h.
    - `query_prescriber(order_id, user, reason)`: Pauses order and logs clinical query.
    - `cancel_request(order_id, user, reason)`: Cancels request on MAR validation failure without stock movement or ledger charges.
    - `substitute_medicine(order_id, user, item_id, substitute_code)`: Swaps medicine with doctor-approved alternative.
    - `get_ward_returns(ward, search)` & `process_ward_return(return_id, user, data)`: 3-step ward returns workflow (`Requested` ──► `Received` ──► `Credited` / `Quarantined` / `Destroyed`).
  - **Endpoints Mounted (`backend/apps/pharmacy/urls.py`):**
    - `GET /api/v1/pharmacy/ipd/kpis/`
    - `GET /api/v1/pharmacy/ipd/queue/`
    - `POST /api/v1/pharmacy/ipd/issue/` & `POST /api/v1/pharmacy/ipd/issue/<uuid:pk>/`
    - `POST /api/v1/pharmacy/ipd/emergency-release/` & `POST /api/v1/pharmacy/ipd/emergency-release/<uuid:pk>/`
    - `POST /api/v1/pharmacy/ipd/query-prescriber/` & `POST /api/v1/pharmacy/ipd/query-prescriber/<uuid:pk>/`
    - `POST /api/v1/pharmacy/ipd/cancel/` & `POST /api/v1/pharmacy/ipd/cancel/<uuid:pk>/`
    - `POST /api/v1/pharmacy/ipd/substitute/` & `POST /api/v1/pharmacy/ipd/substitute/<uuid:pk>/`
    - `GET /api/v1/pharmacy/ipd/returns/` & `POST /api/v1/pharmacy/ipd/returns/<uuid:pk>/process/`
  - **Seed Command (`seed_ipd_pharmacy.py`):**
    - Seeded IPD Pharmacist user Sneha Nair (`sneha_nair` / `Password123!`), formulary stock across FEFO batches, 10 realistic IPD ward requests (`WR-5521`, `WR-5514`, `WR-5519`, `WR-5512`, `WR-5517`, `WR-5516`, `WR-5508`, `WR-5510`, `WR-5506`, `WR-5503`) and 5 ward returns (`RW-031`, `RW-029`, `RW-030`, `RW-027`, `RW-028`).
- **Frontend Architecture & Components:**
  - **Service (`frontend/src/services/pharmacyIpdService.ts`):** Typed API client for all IPD workflows.
  - **Workspace (`frontend/src/pages/pharmacy/ipd/IPDPharmacistWorkspace.tsx`):**
    - 5 operational tabs: `Ward requests`, `Pending issues`, `Issued today`, `Emergency (STAT)`, `Ward returns`.
    - 5 real-time throughput KPI metric cards.
    - Ward filter pills (`All`, `ICU`, `HDU`, `Ward 4B`, `Ward 2A`, `Ward 3C`) and live search.
    - 6-step right-hand panel Inpatient Requisition Wizard (`Ward request` ──► `Review` ──► `Allocate stock` ──► `Issue medicines` ──► `Ward handover` ──► `Complete`).
    - Emergency STAT immediate release modal with retrospective MAR review audit.
    - Ward Returns 3-step inspection and ledger credit interface.
    - Seamless workspace switchers connecting OPD Dispensing, IPD Ward Supply, and Central Medical Store.
  - **Routing & Demo Credentials:**
    - Routed at `/pharmacy/ipd` and `/pharmacy?view=ipd`.
    - Added Sneha Nair (`EMP-PHARM-03`, `sneha.nair@northhospital.com`, password `Password123!`) to `authCatalog.ts` with direct routing to `/pharmacy/ipd`.
- **Validation & Automated Tests:**
  - `apps.pharmacy.tests.PharmacyIPDWorkflowsTestCase`: 6 comprehensive integration tests covering KPIs, queue filtering, standard issue with FEFO stock decrement and admission ledger commit, STAT emergency release, CD dual-sign register entries, prescriber queries, cancellation, and ward returns.
  - **All 37 backend tests pass (0 failures, 0 errors).**
  - **Vite production build succeeds (`npm run build` exits 0 with 0 errors).**

---

# PHASE 7: Controlled Drug & Narcotic System — [COMPLETED]

### Primary Objectives
Implement regulatory compliance, vault security, statutory double-verification, and tamper-proof Schedule X narcotic registers for controlled substances.

### Status: COMPLETED
- **Backend Architecture & Services:**
  - **Models & Migrations:**
    - `PharmacyControlledDrugRegister`: Added audit fields `rx_number`, `remarks`, `vault_location`, `discrepancy_noted`, `discrepancy_notes`.
    - `PharmacyVaultReconciliation`: Created dedicated statutory physical shelf count reconciliation audit model.
    - Applied migration `0008_pharmacycontrolleddrugregister_discrepancy_noted_and_more.py`.
  - **Service (`PharmacyControlledDrugService` in `backend/apps/pharmacy/services.py`):**
    - `get_vault_inventory()`: Returns Schedule X & H1 medicines with vault batch stocks, storage locations (`Vault Safe A (Dual Key Locked)`, `Vault Safe B`), and reorder thresholds.
    - `get_statutory_register(search, schedule, pill, start_date, end_date)`: Filterable non-gapped sequential register entries.
    - `get_summary_metrics()`: Live 4 KPIs (`cd_items_tracked`, `total_vault_stock`, `register_entries_today`, `open_discrepancies`, `dual_sign_compliance: 100.0%`).
    - `get_eligible_witnesses(current_user)`: Returns authorized clinical staff while strictly excluding the primary dispensing pharmacist.
    - `verify_witness_credentials(primary_user, witness_id, pin)`: Validates secondary witness identity and PIN; blocks self-witness attempts.
    - `dispense_controlled_substance(primary_user, data)`: Atomic Schedule X dispense requiring verified secondary witness, decrementing vault batch stock, writing `StockTransactionType.DISPENSE_OPD`, generating non-gapped `CDR-YYYYMM-XXXX` register entry with doctor license # and patient UHID.
    - `reconcile_vault_count(user, witness_user, data)`: Records physical shelf count vs register balance; flags variance and logs discrepancy entries.
    - `export_inspection_report(schedule)`: Assembles Drug Controller & NDPS Act compliant regulatory inspection ledger.
  - **Mounted Endpoints (`backend/apps/pharmacy/urls.py`):**
    - `GET /api/v1/pharmacy/controlled-drug/vault-inventory/`
    - `GET /api/v1/pharmacy/controlled-drug/register/`
    - `GET /api/v1/pharmacy/controlled-drug/summary/`
    - `GET /api/v1/pharmacy/controlled-drug/eligible-witnesses/`
    - `POST /api/v1/pharmacy/controlled-drug/verify-witness/`
    - `POST /api/v1/pharmacy/controlled-drug/dispense/`
    - `POST /api/v1/pharmacy/controlled-drug/reconcile/`
    - `GET /api/v1/pharmacy/controlled-drug/export-report/`
    - Router viewset actions on `PharmacyControlledDrugRegisterViewSet`.
  - **Seed Command (`seed_controlled_drugs.py`):**
    - Seeded Schedule X and H1 drugs (Morphine, Fentanyl, Ketamine, Midazolam, Alprazolam, Clonazepam, Tramadol).
    - Seeded vault batches across Safe A & Safe B.
    - Seeded 7 sequential statutory register records (`CDR-2610-0001` through `CDR-2610-0006`, and `DISC-2610-0001`).
    - Seeded 2 vault physical count reconciliations (`VR-2610-0001` and `VR-2610-0002`).
- **Frontend Architecture & Components:**
  - **Service (`frontend/src/services/pharmacyControlledDrugService.ts`):** Typed API client for all controlled drug and vault workflows.
  - **Statutory Dual-Sign Modal (`frontend/src/components/pharmacy/ScheduleXDualSignModal.tsx`):**
    - Amber alert badge: `[SCHEDULE X - DUAL SIGN-OFF REQUIRED]`.
    - Prescribing doctor license verification and patient wristband verification.
    - 3-point statutory safety check (Prescription sighted, Photo ID verified, Dose verified).
    - Secondary witness picker + credential/PIN authentication with live feedback badge.
    - Real-time vault countdown: `Current Vault Stock ──► Balance After Dispense`.
    - Mandatory statutory remarks (min 8 chars).
  - **Controlled Drug Workspace (`frontend/src/pages/pharmacy/controlled/ControlledDrugRegisterWorkspace.tsx`):**
    - 4 Live Operational KPI cards (Tracked CD items, Entries today, Vault lock status, Compliance rate 100%).
    - 4 Filter Pills (`All Entries`, `Schedule X (Narcotics)`, `Schedule H1`, `Discrepancies`).
    - High-density statutory table with monospace entry IDs, schedule badges, doctor license, patient UHID, quantities, balance after, and dual-sign signatures.
    - Right-hand slide-over audit drawer with print slip support.
    - Physical shelf audit reconciliation modal with real-time variance calculation.
    - Statutory Drug Inspector inspection register export modal with printable NDPS layout.
    - Seamless cross-department switchers connecting OPD Dispensing, IPD Ward Supply, and Central Medical Store.
  - **Routing:** Routed at `/pharmacy/controlled-drugs` and `/pharmacy?view=controlled-drugs`.
- **Validation & Automated Tests:**
  - `apps.pharmacy.tests.PharmacyControlledDrugWorkflowsTestCase`: 8 automated integration tests covering inventory, eligible witness filtering, self-witness rejection, PIN verification, atomic dual-signed dispense, missing witness rejection, vault reconciliation variance detection, and inspection export.
  - **All 45 tests in `apps.pharmacy` pass with 0 failures, 0 errors.**
  - **Vite production build succeeds (`npm run build` exits 0 with 0 errors).**

---

# PHASE 8: Pharmacy Admin & Governance Workspace — [COMPLETED]

### Primary Objectives
Deliver the executive oversight workspace at `/department/pharmacy` (and `/pharmacy/admin`) for `DEPARTMENT_ADMIN` (Dr. Pooja Shah, Chief Pharmacist): PR budget approvals, operational queue monitoring, financial analytics, shift management, formulary pricing, audit trails, and strict enforcement of the **Separation of Concerns**.

### Status: COMPLETED
- **Backend Architecture & Services:**
  - **Service (`PharmacyAdminService` in `backend/apps/pharmacy/services.py`):**
    - `get_admin_dashboard_metrics(activity_scope)`: Aggregated operational volume (OPD, IPD, OTC), hourly distribution bars (07:00 to 14:00), 4 KPI stats, live alerts feed (5 open issues with urgency tagging), inventory health segments (in stock, low stock, near expiry, stockout) and financial valuation, staff performance meters, and recent activity audit stream.
    - `get_staff_roster()`: Pharmacists and technicians with shift schedules, items processed vs shift targets, average turnaround time (TAT), allergy override counts, and controlled drug entries.
    - `get_duty_schedules()` & `update_duty_shift()`: Shift coverage (Morning, Evening, Night) across service points (`OPD-C1`, `IPD-01`, `STORE`, `ER-01`, `ER-NIGHT`), coverage status (`Covered`, `Understaffed`, `Open`), and dynamic staff assignments.
    - `get_governance_audit_logs(filter_pill, search)`: Immutable compliance audit trail with IP/terminal, action, entity reference, and classification (`Override`, `Controlled`, `Discrepancy`, `Adjustment`, `Refund`, `Info`).
    - `review_purchase_request(pr_id, user, action, notes)`: Departmental budget approval or rejection for procurement PRs.
    - `dispatch_purchase_order(po_id, user, notes)`: Formal electronic dispatch of approved POs to wholesale vendors.
    - `update_medicine_pricing(medicine_id, user, data)`: Master formulary pricing updater with audit trail.
  - **Mounted Endpoints (`backend/apps/pharmacy/urls.py`):**
    - `GET /api/v1/pharmacy/admin/analytics/`
    - `GET /api/v1/pharmacy/admin/staff/`
    - `GET /api/v1/pharmacy/admin/shifts/` & `POST /api/v1/pharmacy/admin/shifts/`
    - `GET /api/v1/pharmacy/admin/operations/`
    - `GET /api/v1/pharmacy/admin/inventory-health/`
    - `GET /api/v1/pharmacy/admin/controlled-drug-monitor/`
    - `GET /api/v1/pharmacy/admin/suppliers/`
    - `GET /api/v1/pharmacy/admin/audit-logs/`
    - `GET /api/v1/pharmacy/admin/settings/` & `POST /api/v1/pharmacy/admin/settings/`
    - `GET /api/v1/pharmacy/admin/reports/`
    - `POST /api/v1/pharmacy/purchase-requests/<uuid:pk>/review/`
    - `POST /api/v1/pharmacy/purchase-orders/<uuid:pk>/issue/`
    - `POST /api/v1/pharmacy/medicines/<uuid:pk>/update_pricing/`
  - **Separation of Concerns Middleware Enforcement:**
    - `EnforceSeparationOfConcernsPermission`: Strictly forbids `DEPARTMENT_ADMIN` from accessing counter dispense (`/dispense-orders/`), ward supply issue (`/ipd/issue/`), or store stock adjustments (`/stock-adjustments/`) returning HTTP 403 Forbidden.
- **Frontend Architecture & Components:**
  - **Service (`frontend/src/services/pharmacyAdminService.ts`):** Typed API client for all executive metrics, rosters, shifts, audit logs, and procurement review.
  - **Admin Workspace (`frontend/src/pages/pharmacy/admin/PharmacyAdminWorkspace.tsx`):**
    - Faithfully implemented from `Pharmacy Department UI Specification/Pharmacy Admin Workspace.dc.html`.
    - Left Navigation Sidebar with 4 groups (Overview, Operations, Safety & Stock, Governance) and 10 sections:
      1. `Overview`: 5 KPI cards, hourly prescription activity bar chart + stats, live alerts feed, inventory health progress segments + stats, staff performance shift targets, recent activity audit stream.
      2. `Staff & Roster`: Pharmacists, technicians, shift duty status, items processed vs target, average turnaround time (TAT), allergy override counts, and controlled drug logs.
      3. `Duty Scheduling`: Shift management (Morning, Evening, Night) across OPD counters, IPD store, Emergency satellite, coverage status (`Covered`, `Understaffed`, `Open`), and shift assignment modal.
      4. `Pharmacy Operations`: Throughput points (`OPD-C1`, `OPD-C2`, `IPD-01`, `STORE`, `ER-01`), queue wait times, SLA compliance, lead pharmacist.
      5. `Inventory Health`: Critical stock status, stockouts with clinical impact (`Insulin glargine`, `Levothyroxine`), near-expiry batches.
      6. `Controlled Drug Monitoring`: Daily movements, Schedule X / H1 balances, physical count vs register balance, open discrepancies.
      7. `Suppliers & Procurement`: Approved vendors, active PO references, lead times, on-time delivery %, PR review & PO dispatch approvals.
      8. `Audit Logs`: Filterable compliance event stream (`Override`, `Controlled`, `Discrepancy`, `Adjustment`, `Refund`, `Info`) with user, IP/terminal, and timestamp.
      9. `Department Settings`: Governance toggles (Allergy override reason mandatory, CD witness required, credit allowance limits).
      10. `Reports & Analytics`: Daily dispensing summary, pharmacy revenue breakdown by tender/encounter, expiry risk, controlled drug reconciliation report, and staff productivity export.
    - Right-side sticky inspection drawer with live statistics, detailed blocks, and interactive CSV/PDF export buttons.
    - Shift assignment modal for dynamic roster adjustments.
    - Zero dispense or inventory adjustment mutations: strictly administrative governance.
  - **Department Container & Route Integration:**
    - Routed at `/department/pharmacy` inside `DepartmentWorkspaceContainer` and at direct URL `/pharmacy/admin`.
    - Demo user Dr. Pooja Shah (`EMP-PH-ADM`, `dr.pooja.shah@northhospital.com`, password `Password123!`) registered in `authCatalog.ts`.
- **Validation & Automated Tests:**
  - `apps.pharmacy.tests.PharmacyAdminGovernanceTestCase`: 7 automated tests covering analytics metrics, staff roster, shift updates, operations points, inventory health, PR budget review, PO dispatch, and separation of concerns enforcement.
  - **All 52 tests in `apps.pharmacy` pass with 0 failures, 0 errors.**
  - **Vite production build succeeds (`npm run build` exits 0 with 0 errors).**

---

## Complete Phase Summary Table

| Phase | Core Focus | Primary Actor | Key Deliverables | Status |
|:---:|:---|:---|:---|:---:|
| **Phase 1** | Database Models | Database Agent / Backend | 10 Models, Migrations, Serializers, Check Constraints | **COMPLETED** |
| **Phase 2** | Inventory Manager | Inventory Manager | PR Creation, PO GRN Batches, Stock Ledger, FEFO, Adjustments | **COMPLETED** |
| **Phase 3** | Doctor → Pharmacy | Doctor / OPD / IPD | e-Rx Handoff, Queue Ingestion, Allergy Safety, Read-Only Rule | **COMPLETED** |
| **Phase 4** | OPD Pharmacist | OPD Pharmacist | Dispensing Queue, Verification Drawer, OTC POS, Returns Desk | **COMPLETED** |
| **Phase 5** | Billing Integration | Billing / Reception | The 6 Settlement Engines, Barcode Token, Co-Pay, Ledger Appends | **COMPLETED** |
| **Phase 6** | IPD Pharmacist | IPD Pharmacist | Ward Requisitions, Unit-Dose Picking, MAR Update, Running Bill | **COMPLETED** |
| **Phase 7** | Controlled Drug System | Clinical Pharmacists | Schedule X Flags, Dual Sign-Off Modal, Immutable Register | **COMPLETED** |
| **Phase 8** | Pharmacy Admin | Pharmacy Admin | `/department/pharmacy`, PR Approvals, Analytics, Roster, Governance | **COMPLETED** |
