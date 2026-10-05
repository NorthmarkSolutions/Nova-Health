# PHARMACY_REQUIREMENTS.md

North Hospital HMS — Pharmacy Department
Version: 1.0 (MVP scope)

---

## 1. Purpose

Pharmacy converts a clinician's prescription into medicine actually in the
patient's hands (OPD) or into the ward's supply (IPD), verifying safety along
the way, while keeping stock, billing, and the patient's permanent record in
sync.

**Core design rule:** billing, patient-history, and stock changes fire on
**Dispense/Issue**, never on prescription review. Verification is internal
work; only the act of handing over medicine touches anything outside the
department.

---

## 2. Roles

| Role | Route scope | Core job |
|---|---|---|
| Pharmacy Department Admin | Existing generic `/department/<id>` UI | Staff roster, supplier/vendor master, formulary pricing sync to Billing, department analytics |
| OPD Pharmacist | `/pharmacy` (OPD view) | Verify walk-in prescription → check allergy/stock → dispense at counter |
| IPD Pharmacist | `/pharmacy` (IPD view) | Fulfill ward medication requests off the MAR → issue to ward stock |
| Inventory Manager | `/pharmacy` (inventory view) | Central stock ledger, expiry tracking, reorder alerts, purchase orders |

Radiologist-equivalent split (OTC/walk-in sale as a distinct role) is **not**
required — OTC sale is a Phase 2 feature of the existing OPD Pharmacist role,
not a new role.

---

## 3. Permissions Matrix

| Action | OPD Pharmacist | IPD Pharmacist | Inventory Manager | Pharmacy Admin |
|---|:---:|:---:|:---:|:---:|
| View OPD prescription queue | ✅ | ❌ | ❌ | ✅ (read-only) |
| View IPD medication requests | ❌ | ✅ | ❌ | ✅ (read-only) |
| Dispense (OPD) | ✅ | ❌ | ❌ | ❌ |
| Issue (IPD) | ❌ | ✅ | ❌ | ❌ |
| Override allergy warning | ✅ | ✅ | ❌ | ❌ |
| View stock levels (read) | ✅ | ✅ | ✅ | ✅ |
| Add/adjust/write off stock | ❌ | ❌ | ✅ | ❌ |
| Create purchase order | ❌ | ❌ | ✅ | ❌ (approval only, Phase 2) |
| Edit formulary pricing | ❌ | ❌ | ❌ | ✅ |
| View department analytics | ❌ | ❌ | ❌ | ✅ |
| Manage staff roster | ❌ | ❌ | ❌ | ✅ |

Cannot (all pharmacy roles): write/amend a prescription (Doctor-only), access
billing settlement directly (Cashier-only — Pharmacy only *generates* the
line item), edit clinical notes.

---

## 4. Workflow

```
Doctor generates prescription
        |
Prescription routed to OPD Pharmacist or IPD Pharmacist queue
(routed by encounter type: OPD visit vs IPD admission)
        |
Pharmacist opens prescription
        |
Allergy / interaction check
  (auto, against patient's existing stored allergy data —
   recorded by Nurse at triage / Doctor at consultation;
   never re-asked at the pharmacy counter)
        |
        +-- No conflict ---------------------------> continue
        |
        +-- Conflict found --> WARNING shown (does NOT hard-block)
                 |
                 +-- Pharmacist enters override reason (logged, audited) --> continue
                 |
                 +-- Pharmacist contacts Doctor to amend --> prescription
                         updated --> re-check from allergy step
        |
Inventory validation (live read from Inventory Manager's ledger)
        |
        +-- In stock -----------------------------> continue
        |
        +-- Partial stock --> partial-dispense allowed,
        |                     remainder flagged as backorder --> continue
        |
        +-- Out of stock --> prescription held as "Awaiting Stock"
                              --> Inventory Manager notified (reorder signal)
                              --> resumes automatically when stock arrives
        |
Dispensing / Issuing
        |
        +-- OPD --> single counter handover to patient
        |
        +-- IPD --> bulk/ward issue against the admission's MAR
        |
BILLING FIRES HERE (not before)
        |
        +-- OPD --> line item added to patient's invoice (Cashier ledger)
        |
        +-- IPD --> line item added to the admission's running ledger
        |           (same Billing system, tagged IPD; visible to Ward Manager)
        |
Patient record updated — medication entry attaches permanently
        |
(IPD only) Nurse's MAR reflects "Issued" for administration reconciliation
        |
Completion — stock ledger decremented, prescription marked Fulfilled
```

---

## 5. Screens

### MVP

| Screen | Layout template | Purpose |
|---|---|---|
| OPD Dispensing Queue | Queue Workspace | Work list of OPD prescriptions to verify/dispense |
| Prescription Detail (drawer) | Clinical Workspace (nested) | Verify + dispense one prescription |
| IPD Medication Request Queue | Queue Workspace | Work list of ward medication requests |
| Ward Issue Detail (drawer) | Clinical Workspace (nested) | Verify + issue one ward request |
| Inventory Dashboard | Dashboard Workspace | Stock health overview — KPIs, trend, alerts |
| Stock / Item Ledger | Management Workspace | Manage items, batches, expiry, write-offs |

### Phase 2

- Purchase Orders / Goods Received formal workflow
- OTC / walk-in-without-prescription sale (OPD Pharmacist)
- Return / cancellation handling
- Generic substitution suggestions

### Advanced

- Supplier EDI / automated reordering
- Demand forecasting analytics
- Mobile ward-round issuing app
- Regulatory disposal / write-off reporting

---

## 6. Screen Detail (MVP)

### OPD Dispensing Queue
- Header: title, description, primary action area (OTC sale disabled for MVP)
- KPIs (4): Pending verification · Awaiting stock · Dispensed today · Overrides today
- Filters: status pills — All / Pending / On Hold / Dispensed
- Main content: table — Patient, Drug(s), Doctor, Priority, Status, row actions
- Row action: Open → opens Prescription Detail drawer
- Empty state: "No prescriptions waiting — new ones will appear here automatically"

### Prescription Detail (drawer)
- Header: patient name, UHID, prescribing doctor
- Content: drug list with dose/frequency, allergy-check banner (green/amber/red), per-line stock availability
- Actions: Dispense (primary) · Hold (secondary) · Override Allergy Warning (danger, requires logged reason)
- Confirmation modal: override reason entry before proceeding

### IPD Medication Request Queue
- Same structure as OPD Dispensing Queue, with Ward and Admission ID columns, "Issue" as the primary verb instead of "Dispense"

### Ward Issue Detail (drawer)
- Same structure as Prescription Detail, plus admission/ward context, "Issue" instead of "Dispense"

### Inventory Dashboard
- Header: title, description, primary action "Add Stock"
- KPIs (5): Low stock SKUs · Expiring within 30 days · Reorder alerts · Stockouts this week · Dispense volume today
- Main content: usage/turnover trend chart (left) + urgent expiry/reorder list (right)
- Secondary content: quick links into Stock Ledger filtered by alert type
- Empty state: "No alerts — inventory healthy"

### Stock / Item Ledger
- Header: title, description, primary action "Add Item"
- Filters: search bar + category/expiry-status pills
- Main content: table — Item, Batch, Quantity, Expiry, Supplier, Status, row actions (Adjust, Write Off)
- Drawer: Add/Edit Item, Receive Stock
- Empty state: "No items match your filters"

---

## 7. Exceptions

| Exception | Handling |
|---|---|
| Allergy/interaction conflict | Warn, do not hard-block. Pharmacist must log an override reason, or contact Doctor to amend the prescription. |
| Out of stock | Prescription held as "Awaiting Stock"; Inventory Manager notified as a reorder signal; resumes automatically once stock is received. |
| Partial stock | Partial dispense allowed; remainder flagged as backorder against the same prescription. |
| Prescription amendment needed | Loops back to Doctor; re-enters the allergy-check step once updated. |
| IPD billing destination | Routes to the same Billing system as OPD, tagged `IPD`, reflected on the admission's ledger owned by Ward Manager — not the Cashier's OPD counter revenue. |
| Return / cancellation after dispense | Out of MVP scope — MVP treats Dispensed/Issued as final. |

---

## 8. Future Features (confirmed Phase 2 / Advanced, not building now)

- OTC / walk-in sale without a prescription
- Formal Purchase Order + Goods Received workflow
- Return/cancellation handling for dispensed medication
- Generic drug substitution suggestions
- Supplier EDI / automated reordering
- Demand forecasting analytics
- Mobile ward-round issuing app
- Regulatory disposal and write-off reporting

---

## 9. Component Reuse

No new UI patterns required. Reuses components already established across
Nurse, Doctor, Reception, and Lab:

- WorkspaceHeader
- KpiRow / KpiCard
- RowActionsMenu
- FilterPillGroup
- DataTable (sticky header, 56px rows, search, pagination)
- Drawer
- Modal (confirm-step — used for allergy override and write-off confirmation)
- StatusBadge
- PrimaryActionBar

---

## 10. Open Decisions Carried Forward

These were assumed by default during design and should be explicitly
confirmed or corrected:

1. IPD dispense billing routes to the same Billing system tagged `IPD`,
   tied to the Ward Manager's admission ledger — confirm this matches the
   actual billing architecture.
2. Allergy conflicts warn-and-override rather than hard-block — confirm
   this is the desired safety behavior.
3. OTC/walk-in-without-prescription sale is out of MVP scope — confirm
   before Phase 2 planning.
