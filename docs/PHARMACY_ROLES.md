# NorthHospital HMS — Pharmacy Department Roles Specification

**Document Version:** 2.0  
**Design Standard:** Conforms to `hms-design-bible.md`  
**Module:** Clinical Pharmacy, Ward Supply & Procurement Management  

---

# 1. Overview & Cadre Structure

The North Hospital Pharmacy Department operates with four specialized roles that enforce clinical safety, strict inventory accountability, procurement discipline, and financial synchronization.

| Role | System Identifier | Route Scope | Primary Cadre | Accent Color |
|:---|:---|:---|:---|:---|
| **Pharmacy Department Admin** | `PHARMACY_ADMIN` | `/department/pharmacy` | Executive Administration | `#0284c7` (Sky Blue) |
| **OPD Pharmacist** | `OPD_PHARMACIST` | `/pharmacy?view=opd` | Clinical Pharmacist | `#2563EB` (Royal Blue) |
| **IPD Pharmacist** | `IPD_PHARMACIST` | `/pharmacy?view=ipd` | Inpatient Pharmacist | `#7C3AED` (Purple) |
| **Inventory Manager** | `INVENTORY_MANAGER` | `/pharmacy?view=inventory` | Supply Chain & Logistics | `#0D9488` (Teal) |

---

# 2. Pharmacy Department Admin

### 2.1 Role Profile
- **Title:** Pharmacy Director / Department Administrator
- **Typical Credential:** PharmD, MBA (Healthcare Management)
- **Primary Screen:** Generic Department Workspace (`/department/pharmacy`)
- **Key Objective:** Oversee departmental throughput, staff shifts, supplier contracts, formulary pricing, procurement approvals, and regulatory compliance.

### 2.2 Core Responsibilities (What Admin CAN Do)
1. **Approve Purchase Requests (PRs):** Evaluates incoming Purchase Requests submitted by the Inventory Manager. Approves or rejects requisitions against departmental budget, and converts approved PRs into official Purchase Orders (POs) dispatched to suppliers.
2. **Monitor Operations:** Oversees live operational queues across OPD dispensing and IPD ward supply, monitoring prescription wait times, fulfillment SLAs, and critical stockout alerts in real time.
3. **View Reports & Financial Analytics:** Analyzes departmental revenue, margin realization, formulary consumption patterns, expiry wastage forecasts, and statutory controlled substance registers.
4. **Manage Staff & Shift Rosters:** Manages staff profiles, credentials, role assignments, and shift rosters (Morning, Evening, Night) across all pharmacy personnel.
5. **Supplier Master & Vendor Terms:** Manages approved vendor master files, wholesale drug licenses, and credit payment terms (Net-30/60).
6. **Formulary Master & Tariff Pricing:** Defines hospital drug catalog, unit retail prices, and contractual TPA/insurance institutional schedules.

### 2.3 Strict Boundaries (What Admin CANNOT Do — Enforced by Separation of Concerns)
- ❌ **CANNOT Dispense Medicines:** Outpatient and counter OTC dispensing belongs strictly to licensed `OPD_PHARMACIST`. Admin accounts cannot touch dispensing counters.
- ❌ **CANNOT Adjust Stock:** Physical batch stock count adjustments, quarantine write-offs, and inbound GRN receipt belong strictly to `INVENTORY_MANAGER`. This prevents inventory falsification and fraud.
- ❌ **CANNOT Issue Medicines:** Inpatient unit-dose picking and ward MAR supply fulfillment belong strictly to `IPD_PHARMACIST`.
- ❌ Cannot author, alter, or cancel doctor clinical prescriptions.
- ❌ Cannot unilaterally delete audit logs or manipulate billing credit ledgers.

---

# 3. OPD Pharmacist

### 3.1 Role Profile
- **Title:** Outpatient Dispensing Pharmacist
- **Typical Credential:** B.Pharm / Registered Pharmacist (R.Ph)
- **Primary Screen:** OPD Dispensing Queue & Prescription Detail Drawer (`/pharmacy?view=opd`)
- **Key Objective:** Rapid, zero-error prescription verification, patient allergy screening, stock allocation, direct counter dispensing, and OTC walk-in sales.

### 3.2 Day-in-the-Life Workflow
1. **Queue Monitoring:** Monitors live incoming prescription queue from OPD consultation chambers.
2. **Prescription Review:** Opens prescription drawer to view prescribed drugs, dosage, frequency, and duration.
3. **Safety Verification:** System auto-crosschecks patient allergies recorded by triage nurse or doctor.
   - If clean: displays green check banner.
   - If allergic conflict detected: displays amber/red alert banner with exact cross-reactivity warning.
   - Override requirement: if clinically justified after doctor confirmation, must input logged rationale.
4. **Stock Check & FEFO Allocation:** Allocates earliest-expiry batch (FEFO).
5. **Billing Settlement & Financial Routing:** Selects appropriate financial settlement mode across the 6 supported engines:
   - *Pay At Pharmacy:* Direct POS counter cash, card swipe, or dynamic UPI QR.
   - *Pay At Reception:* Generates barcoded dispense slip for deferred central cashier payment.
   - *Insurance (TPA):* Applies contractual institutional pricing, splits deductible/co-pay, captures pre-auth approval code.
   - *Corporate / Institutional:* Empanelled client selection, employee badge capture, digital voucher signature.
   - *Hospital Credit:* Validates staff allowance or VIP credit limit with required Admin sign-off.
6. **Dispense Execution (The Sole Mutation Point):** Clicks **Dispense & Bill**. This is the **ONLY** action in the entire lifecycle that decrements stock from `pharmacy_batches` and creates/updates billing records. Prior steps (doctor prescribing, pharmacist queueing, allergy cross-checking, and batch verification) are strictly read-only.
7. **OTC Walk-in Sales:** Handles non-prescription consumer requests via Quick OTC POS.
8. **Patient Returns:** Inspects returned sealed medication and issues credit note refund requests.
9. **Controlled Substance Dispense:** Performs double-verification with witness for Schedule X / narcotic scripts.

### 3.3 Strict Boundaries (What They CANNOT Do)
- ❌ Cannot alter the doctor's prescribed dosage or drug without doctor re-prescription.
- ❌ Cannot dispense prescription-only drugs under the OTC walk-in mode.
- ❌ Cannot approve Purchase Requests or modify supplier vendor terms.

---

# 4. IPD Pharmacist

### 4.1 Role Profile
- **Title:** Inpatient & Ward Supply Pharmacist
- **Typical Credential:** B.Pharm / Clinical Pharmacist
- **Primary Screen:** IPD Medication Request Queue & Ward Issue Drawer (`/pharmacy?view=ipd`)
- **Key Objective:** Fulfill inpatient doctor rounds orders and ward emergency requests against the Medication Administration Record (MAR).

### 4.2 Day-in-the-Life Workflow
1. **Ward Request Ingestion:** Views orders grouped by Inpatient Ward (e.g. `ICU`, `Surgical Ward B`, `Cardiology CCU`).
2. **Inpatient MAR Cross-Check:** Verifies admission ID, attending consultant, and previous doses administered.
3. **Batch Picking & Labeling:** Prepares unit-dose packs or intravenous fluids with ward-specific patient barcodes.
4. **Issue Execution (Ward Request ──► Issue ──► Admission Ledger Update):** Confirms batch allocation and clicks **Issue to Ward**. Settlement mode is locked to `IPD_RUNNING_BILL` with zero upfront cash collection; line items are atomically committed to the patient's active `InpatientAdmission` running ledger and the Nurse MAR is updated to `READY_TO_ADMINISTER`. This guarantees that unbilled medications are never lost during discharge clearance.
5. **Ward Medication Returns:** Receives discontinued or post-op unused ampoules from ward nurses and processes inventory restock.

### 4.3 Strict Boundaries (What They CANNOT Do)
- ❌ Cannot administer medication to patients (exclusively Nurse responsibility).
- ❌ Cannot discharge inpatient or settle final hospital bill.
- ❌ Cannot dispense directly to outpatient walk-ins.

---

# 5. Inventory Manager

### 5.1 Role Profile
- **Title:** Central Pharmacy Stores & Inventory Controller
- **Typical Credential:** Materials Management Degree / Senior Pharmacist
- **Primary Screen:** Inventory Dashboard, Stock Ledger & Procurement (`/pharmacy?view=inventory`)
- **Key Objective:** Maintain 100% drug availability, execute the procurement pipeline, eliminate stockouts, manage batch expiry rotation (FEFO), and handle supplier receipts.

### 5.2 Day-in-the-Life Workflow
1. **Stock Health Review:** Checks KPIs (Low Stock SKUs, Expiring <30d, Critical Reorders, Stockout incidents).
2. **Generate Purchase Requests (PR):** Drafts and submits reorder requisitions to the Pharmacy Admin.
3. **Goods Receipt Processing (GRN):** Receives physical shipments against issued POs, enters invoice numbers, batch numbers, manufacturing dates, and expiry dates.
4. **Batch Quarantine & Expiry Audits:** Flags and isolates expired or recalled batches from active dispense picking.
5. **Stock Adjustments & Write-Offs:** Documents damaged vials or physical discrepancies with required audit notes.

### 5.3 Strict Boundaries (What They CANNOT Do)
- ❌ Cannot dispense or issue medications to patients or wards.
- ❌ Cannot unilaterally issue Purchase Orders without Pharmacy Admin approval.
- ❌ Cannot modify formulary selling prices (Department Admin only).
