# OPD Cross-Department Workflow — Implementation Plan

Version 1.0 · 15 Oct 2026 · Scope: OPD (admin, nurse, doctor, doctor assistant), Reception, Billing, Accounts, Lab, Pharmacy

This document defines (1) the end-to-end workflows that start at the OPD desk, (2) the server tables and APIs needed so
every step is stored in the database instead of the browser, and (3) the test cases that prove the departments exchange
data correctly and stay consistent. Read it top to bottom before writing code; build in the phase order in §7.

---

## 1. Goal and principles

**Goal:** one patient visit, from token to ledger, is fully recorded on the server, and every department sees the same
data at the same time.

Principles:

1. **The server is the source of truth.** The browser store (`localStorage` in `patientJourneyService`) becomes a cache
   only. Every write goes to an API; screens re-read from the API.
2. **One encounter ID ties everything together.** Every OPD visit gets an `OpdVisit` record. Lab orders, prescriptions,
   dispense orders, charges, invoices, payments and journal entries all carry its ID (`encounter_id`).
3. **Departments talk through events, not by writing into each other's tables.** OPD emits "charge" events to Billing;
   Billing emits "financial" events to Accounts. Each event has an idempotency key so a retry never double-charges.
4. **Gates are enforced on the server**, not only in the UI (e.g. no sample collection or dispensing before payment,
   no completion without a diagnosis).
5. **Every action records who did it and on whose behalf** (`performed_by`, `on_behalf_of`). The doctor assistant can
   perform any doctor action; it is recorded as the assistant acting for the doctor (§5).
6. **Reuse existing models** wherever they already exist (§3.1). Do not create parallel tables.

---

## 2. Roles involved

| Department | Roles (login) | What they do in these workflows |
|---|---|---|
| Reception | Receptionist, Reception supervisor | Register patient, issue token, book / check-in appointment, collect desk fee, allocate day-care bed |
| OPD | Nurse | Call to triage, vitals + triage category, collect samples, treatment room, day-care chart |
| OPD | Doctor | Consult, prescribe, order tests, complete visit, follow-up, review results |
| OPD | Doctor assistant | **Same authority as the doctor** (on behalf of the assigned doctor) + chamber queue, checkout, follow-up booking |
| OPD | OPD admin | Doctors, fees, chambers, roster, policies (configuration the others read) |
| Lab | Technician, Pathologist, Lab admin | Receive sample, run, enter results, sign report, critical call-back |
| Pharmacy | Pharmacist (OPD counter) | Dispense prescription, stock deduction, pharmacy bill |
| Billing | Cashier, Billing supervisor, Billing admin | Collect pending charges, invoices, receipts, refunds, shift close |
| Accounts | Accountant, Finance manager (+ others) | Journals from Billing events, day close, receivables |

---

## 3. Server data model

### 3.1 Existing models to reuse (do not duplicate)

| App | Model | Use in this plan |
|---|---|---|
| `patients` | `Patient` | Patient master (UHID). Already written to on registration. |
| `appointments` | `Appointment` | Advance bookings. Has `token_number`, `desk_payment`, `source`, `external_ref`. Keep for **bookings**; the live visit moves to `OpdVisit`. |
| `appointments` | `VitalSign` | Extend (see 3.3) — currently one-to-one with `Appointment` and has invented defaults (120/80, 98.6…) that must become nullable. |
| `clinical` | `Consultation`, `Prescription`, `PrescriptionItem` | Use for the consultation and prescription. Extend (3.3). |
| `lab` | `LabOrder`, `LabResult`, `LabReport`, `CriticalCallback` | Already on the server. Add `encounter_id` link. |
| `pharmacy` | `PharmacyDispenseOrder(+Item)` | Already created by the prescription hand-off. Add `encounter_id`, `prescription_id`. |
| `billing` | `DepartmentChargeEvent`, `BillableChargeItem`, `Invoice`, `InvoiceItem`, `Payment`, `BillingReceipt`, `CounterShift` | Charges → invoice → payment. Emitters already exist: `emit_opd_consultation_charge`, `emit_lab_test_charges`, `emit_pharmacy_dispense_charge`. |
| `billing` | `GeneralLedgerJournalEntry(+LineItem)` | Billing's own GL posting (`post_realtime_invoice_journal`). |
| `accounting` | `FinancialEvent`, `IntegrationOutbox`, `Journal`, `JournalLine`, `GLEntry`, `DailyCloseRun`, `Receivable` | Accounts' ledger. **Verify** whether Billing currently feeds `FinancialEvent` (§8 open item 1). |
| `ipd` | `InpatientAdmission` | Only for the referral/admission case (later phase). |

### 3.2 New tables (new app: `apps/opd`)

All tables: UUID `id`, `created_at`, `updated_at`, `created_by`, and `department_id='OPD'` where relevant.

**`OpdVisit`** — the encounter. One row per token per day. Replaces the browser `nh_queue` token.

| Field | Type | Notes |
|---|---|---|
| `visit_number` | char, unique | e.g. `OPV-20261015-0007` |
| `token_number` | int | unique per (date, department) |
| `visit_date` | date | indexed |
| `patient` | FK Patient | |
| `doctor` | FK DoctorProfile | current doctor (can change on reassign) |
| `chamber` | FK OpdChamber, null | |
| `appointment` | FK Appointment, null | when checked in from a booking |
| `visit_type` | enum `NEW`, `FOLLOW_UP`, `EMERGENCY`, `REVIEW` | drives the fee |
| `priority` | enum `NORMAL`, `URGENT`, `VIP`, `EMERGENCY` | |
| `status` | enum (state machine §4) | `WAITING`, `CALLED_TRIAGE`, `IN_TRIAGE`, `READY_FOR_DOCTOR`, `CALLED_IN`, `IN_CONSULTATION`, `AWAITING_REPORTS`, `ON_HOLD`, `COMPLETED`, `CHECKED_OUT`, `NO_SHOW`, `CANCELLED` |
| `hold_reason` | text, null | |
| `issued_at`, `triage_started_at`, `triaged_at`, `called_at`, `seated_at`, `completed_at`, `checked_out_at` | datetime, null | timeline for reports |
| `fee_amount` | decimal | snapshot of the fee charged |
| `fee_status` | enum `UNPAID`, `PAID`, `WAIVED`, `NONE` | mirrors Billing |
| `charge_event` | FK DepartmentChargeEvent, null | the consultation charge |
| `checkout_routes` | JSON list | e.g. `["PHARMACY","LAB"]` |
| `referral` | JSON, null | `{department, reason}` |
| `source_ref` | char, unique, null | browser token id during migration (`tok-<ms>`) for idempotent sync |

Indexes: `(visit_date, status)`, `(visit_date, doctor)`, `(patient, visit_date)`.
Constraint: one active (not COMPLETED/CHECKED_OUT/NO_SHOW/CANCELLED) visit per patient per day.

**`OpdVisitEvent`** — immutable audit trail of every status change and action.

| Field | Notes |
|---|---|
| `visit` FK, `action` (e.g. `ISSUED`, `CALLED_TRIAGE`, `TRIAGED`, `CALLED_IN`, `SEATED`, `HELD`, `COMPLETED`, `CHECKED_OUT`, `REASSIGNED`, `MARKED_EMERGENCY`) | |
| `from_status`, `to_status` | |
| `performed_by` FK User, `on_behalf_of` FK User null | assistant acting for doctor |
| `role` | role at the time |
| `payload` JSON, `at` datetime | |

**`TriageAssessment`** — the nurse's assessment (one per visit; editable until the visit is completed).

| Field | Notes |
|---|---|
| `visit` 1-1, `chief_complaint`, `pain_score` (0–10, null) | |
| `triage_category` enum `IMMEDIATE`…`NON_URGENT`, `news2` int null | |
| `allergies` JSON (incl. `NKDA`), `conditions` JSON, `current_medications` JSON | also written back to `Patient` |
| `fall_risk`, `pregnancy`, `nurse_notes` | |
| `triaged_by` FK User, `triaged_at` | |

**`VitalSign` (extended, not new)** — make every measurement nullable (remove invented defaults); add `visit` FK
(null), `respiratory_rate`, `avpu`, `on_oxygen`, `rbs`, `news2`, `context` enum `TRIAGE`/`OBSERVATION`/`CHAMBER`.

**`ConsultationDraft`** — autosaved work-in-progress per visit (`visit` 1-1, `data` JSON, `updated_by`). Deleted on completion.

**`OpdProcedure`** — treatment-room record (injection, drip, nebulisation, dressing, ECG).

| Field | Notes |
|---|---|
| `visit` FK, `patient` FK, `kind`, `detail`, `prescription_item` FK null | |
| `route`, `site`, `batch_no`, `status` `GIVEN`/`REFUSED`, `note` | |
| `ordered_by` FK User, `given_by` FK User, `given_at` | |
| `charge_event` FK DepartmentChargeEvent null | procedure charge |

**`OpdFollowUp`** — the doctor's follow-up instruction.
`patient`, `visit` (origin), `doctor`, `due_date`, `reason`, `status` `PENDING_BOOKING`/`BOOKED`/`COMPLETED`/`MISSED`,
`appointment` FK null, `reminders` JSON.

**`DaycareStay`** — day-care / observation bed stay. `visit`, `patient`, `bed_ref` (campus bed id), `admitted_at`,
`discharged_at`, `discharge_outcome`, `doctor`, `charge_event` FK null.
**`NursingChartEntry`** — `stay` FK, `kind` `READING`/`ESCALATION`/`NOTE`, vitals fields, `news2`, `escalated_to`, `by`, `at`.

**`PatientDocument`** — outside reports. `patient`, `visit` null, `title`, `category`, `source`, `report_date`, `file`
(FileField; replaces data-URL scans), `shown_to_doctor_at`, `uploaded_by`.

**OPD configuration** (currently browser-only in `departmentWorkspaceStore`):

| Table | Fields |
|---|---|
| `OpdDoctorRoster` | `doctor` FK DoctorProfile, `specialty`, `working_days` JSON, `start_time`, `end_time`, `capacity_per_day`, `minutes_per_patient`, `status` `ACTIVE`/`ON_LEAVE`/`OFF_DUTY`, `chamber` FK |
| `OpdChamber` | `room_number` unique, `name`, `type`, `floor`, `status`, `equipment` JSON, `nurse` FK User null |
| `OpdDoctorBlock` | `doctor`, `date`, `all_day`, `from_slot`, `to_slot`, `reason`, `created_by` |
| `OpdDoctorStatus` | `doctor` 1-1, `status` `IN`/`BREAK`/`ROUNDS`/`OT`/`LATE`/`OUT`, `until`, `note`, `set_by`, `since` |
| `OpdPolicy` | singleton: `daily_capacity`, `walk_in_allowed`, `operating_hours` |
| `OpdDutyRoster` | `date`, `shift`, `staff` FK User, `role`, `chamber` FK null |
| `OpdAdminAudit` | `kind`, `subject`, `change`, `before`, `after`, `by`, `at` |

**Fees** move into Billing's existing `TariffMaster` (service codes below) instead of the browser tariff:

| Service code | Meaning |
|---|---|
| `OPD-CONSULT-{doctorCode}-NEW` / `-FU` / `-ER` | consultation fee by visit type |
| `OPD-REG` | first-visit registration |
| `OPD-TRIAGE` | triage/vitals fee (if charged) |
| `OPD-PROC-{kind}` | treatment-room procedure |
| `OPD-DAYCARE-HR` / `-DAY` | day-care bed |

### 3.3 Changes to existing tables

| Table | Change |
|---|---|
| `Consultation` | add `visit` FK (1-1), `performed_by`, `on_behalf_of`, `advice`, `referral` JSON, `status` `DRAFT`/`FINAL`, `co_signed_by` null, `co_signed_at` null |
| `Prescription` | add `visit` FK, `performed_by`, `on_behalf_of`, `dispense_order` FK null |
| `PrescriptionItem` | add `timing`, `pharmacy_medicine` FK null (formulary link), `is_clinic_dose` bool (given in the treatment room) |
| `LabOrder` | add `encounter_id` (= `OpdVisit.id`), `ordered_on_behalf_of` |
| `PharmacyDispenseOrder` | add `encounter_id`, `prescription` FK null |
| `DepartmentChargeEvent` | already has `encounter_id` — always set it to `OpdVisit.id` |
| `VitalSign` | see 3.2 |

---

## 4. Visit state machine (enforced in `apps/opd/services.py`)

```
WAITING ──call to triage──▶ CALLED_TRIAGE ──start──▶ IN_TRIAGE ──send to doctor──▶ READY_FOR_DOCTOR
   │                                                                                    │
   └──── skip triage (reason) ──────────────────────────────────────────────────────────┤
                                                                                         ▼
                              ON_HOLD ◀──hold── (any waiting state)              CALLED_IN ──seated──▶ IN_CONSULTATION
                                                                                         │
                 AWAITING_REPORTS ◀── send for tests ──────────────────────────────── IN_CONSULTATION
                       │ (all lab results signed) ──▶ READY_FOR_DOCTOR
                                                                    IN_CONSULTATION ──complete──▶ COMPLETED ──checkout──▶ CHECKED_OUT
Any waiting state ──no-show (reason)──▶ NO_SHOW        Any state before IN_CONSULTATION ──cancel (supervisor)──▶ CANCELLED
```

Server rules:

- Only one visit per doctor may be `CALLED_IN` or `IN_CONSULTATION` at a time.
- `complete` requires a diagnosis, valid prescription lines (frequency + days), and confirmation of any allergy warning.
- Every transition writes an `OpdVisitEvent`.
- Reassigning the doctor is allowed until `IN_CONSULTATION` and is logged.

---

## 5. Doctor assistant authority

Decision: **the assistant can perform every doctor action**, so the workflows run even when the doctor never opens the
doctor desk.

- `apps/opd/permissions.py`: `IsDoctorOrAssistant` — allows `DOCTOR`, or `DOCTOR_ASSISTANT` acting for a doctor.
- The assistant is linked to doctors in a new table **`AssistantAssignment`** (`assistant` FK User, `doctor` FK
  DoctorProfile, `active`). The assistant may act only for an assigned doctor (server-checked).
- Every doctor-level write stores `performed_by = assistant`, `on_behalf_of = doctor user`, and the clinical record's
  `doctor = the doctor` (prescriptions print under the doctor's name with "entered by {assistant}").
- **Co-sign queue (recommended):** consultations/prescriptions entered by an assistant are `FINAL` and flow
  downstream immediately, but appear in the doctor's "To co-sign" list. Co-signing sets `co_signed_by/at`. Optional
  policy flag in `OpdPolicy`: `require_cosign_for_schedule_h` (narcotics/Schedule H dispensing waits for co-sign).
- Frontend: the assistant desk gets the doctor's consultation screen (reuse `DocConsultView`) for the selected doctor.

---

## 6. APIs

All under `/api/v1/opd/` unless noted. JSON in/out, camelCase in the serializer layer, mapped in
`frontend/src/services/opdService.ts` (new) per bible §19.9.

### 6.1 Visits & queue

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/visits/?date=&doctor=&status=` | all OPD, reception | today's queue (polling 10–15 s, later websocket) |
| POST | `/visits/` | reception | issue token (walk-in / check-in appointment). Enforces policy (walk-in allowed, capacity, doctor block). Emits consultation charge. |
| GET | `/visits/{id}/` | all | full visit with triage, vitals, consultation, orders, charges, timeline |
| POST | `/visits/{id}/transition/` | by role | body `{action, reason?}` — call-triage, start-triage, hold, resume, call-in, seat, no-show, cancel, mark-emergency |
| POST | `/visits/{id}/reassign/` | reception, OPD admin | change doctor/chamber |
| GET | `/visits/{id}/events/` | all | audit trail |

### 6.2 Nurse

| Method | Path | Does |
|---|---|---|
| PUT | `/visits/{id}/triage/` | save draft triage + vitals |
| POST | `/visits/{id}/triage/submit/` | validate (BP, pulse, temp, SpO₂, category, allergies) → `READY_FOR_DOCTOR`; writes allergies to Patient |
| POST | `/visits/{id}/procedures/` | treatment-room record → emits `OPD-PROC-*` charge |
| POST | `/daycare/stays/` · `/daycare/stays/{id}/chart/` · `/daycare/stays/{id}/discharge/` | day-care stay, chart, discharge (emits bed charge) |
| POST | `/emergency-alerts/` · `/emergency-alerts/{id}/attend/` | Code Blue / escalation |

### 6.3 Doctor / assistant

| Method | Path | Does |
|---|---|---|
| PUT | `/visits/{id}/consultation/draft/` | autosave draft |
| POST | `/visits/{id}/send-for-tests/` | create lab orders (via `apps/lab` service, `encounter_id` set) → `AWAITING_REPORTS` |
| POST | `/visits/{id}/complete/` | **one transaction**: `Consultation` + `Prescription(+Items)` + lab orders + `OpdFollowUp` + pharmacy hand-off (`PharmacyDispenseOrder`) + visit `COMPLETED`. Idempotent on `Idempotency-Key` header. |
| POST | `/consultations/{id}/cosign/` | doctor co-signs assistant entries |
| GET | `/doctors/{id}/cosign-queue/` | items to co-sign |
| POST | `/allergy-check/` | proxy to pharmacy allergy check |

### 6.4 Assistant / chamber desk

| Method | Path | Does |
|---|---|---|
| POST | `/visits/{id}/checkout/` | record routes → `CHECKED_OUT` |
| GET/POST | `/follow-ups/` · `/follow-ups/{id}/book/` | list; book creates `Appointment` and links it |
| POST | `/documents/` (multipart) · `/documents/{id}/shown/` | outside reports |
| PUT | `/doctors/{id}/status/` | doctor status |

### 6.5 OPD admin

`/roster/doctors/`, `/chambers/`, `/blocks/`, `/policy/`, `/duty-roster/`, `/audit/` — CRUD, each write logged in
`OpdAdminAudit`. Fee changes go to Billing `TariffMaster` via existing tariff change endpoints.

### 6.6 Cross-department contracts (existing endpoints to confirm/extend)

| From → To | Contract |
|---|---|
| OPD → Billing | `DepartmentChargeService.emit_opd_consultation_charge(visit)` (adapt from appointment), `emit_procedure_charge`, `emit_daycare_charge`. Charge carries `encounter_id`, `source_reference = visit_number`. |
| OPD → Lab | `LabOrderService.create(patient, test, priority, location, clinical_notes, encounter_id, ordered_by, on_behalf_of)` |
| Lab → Billing | existing `emit_lab_test_charges(lab_order)`; gate `is_lab_sample_collection_allowed` |
| OPD → Pharmacy | existing `/pharmacy/prescriptions/handoff/` — add `prescription_id`, `encounter_id` |
| Pharmacy → Billing | existing `emit_pharmacy_dispense_charge` |
| Billing → Accounts | invoice/payment → `accounting.FinancialEvent` (`event_type` `OPD_CONSULT_REVENUE`, `LAB_REVENUE`, `PHARMACY_REVENUE`, `CASH_RECEIPT`) via `IntegrationOutbox`, idempotency key = `{invoice_no}:{payment_id}` |

---

## 7. Implementation phases

| Phase | Work | Done when |
|---|---|---|
| **P0 Verify** | Confirm Billing → Accounts path; list current `/billing/opd/front-desk/sync` behaviour; snapshot DB | open items in §8 answered |
| **P1 Visit core** | `apps/opd` app, `OpdVisit`, `OpdVisitEvent`, state machine, visits API, consultation charge from visit. Reception issues tokens via API. | WF-1 steps 1–2 pass |
| **P2 Triage** | `TriageAssessment`, extended `VitalSign`, nurse API; nurse desk reads/writes API | WF-1 step 3 passes |
| **P3 Consultation** | Extend `Consultation`/`Prescription`, draft, complete transaction, lab/pharmacy links, `AssistantAssignment` + permissions, co-sign | WF-1, WF-2 pass incl. assistant variant |
| **P4 Checkout & follow-up** | checkout, `OpdFollowUp`, booking → `Appointment`, documents | WF-5 passes |
| **P5 Treatment room & day-care** | `OpdProcedure`, `DaycareStay`, chart, charges | WF-3, WF-4 pass |
| **P6 OPD config** | roster, chambers, blocks, status, policy, duty roster, audit → server; fees → `TariffMaster` | WF-7 passes |
| **P7 Frontend switch** | `opdService.ts`; replace `patientJourneyService` OPD calls; browser store becomes cache; one-time migration of today's browser tokens by `source_ref` | no OPD screen writes to localStorage |
| **P8 E2E** | run §9 suite against a fresh seeded DB | all cases green, consistency checks pass |

Each phase ships migrations, serializers, permissions, unit tests (`apps/opd/tests.py`) and the frontend switch for
the screens it touches.

---

## 8. Open items to verify in P0

1. Does `billing.post_realtime_invoice_journal` (Billing's own GL) also create `accounting.FinancialEvent` /
   `Journal`? If not, add the outbox bridge (§6.6) — this decides whether Accounts sees OPD revenue.
2. What `/billing/opd/front-desk/sync` currently creates (Appointment rows with `source='FRONT_DESK'`?) — reuse its
   logic for `POST /visits/`, then retire the sync.
3. `DoctorProfile` exists only for `dr.sarah`; seed profiles for every OPD roster doctor.
4. Pharmacy dispense: confirm stock deduction + `emit_pharmacy_dispense_charge` happen on dispense, not on hand-off.
5. Radiology has no department — imaging orders stay as a charge-only line (`OPD-IMG-*`) until a radiology app exists.

---

## 9. Workflow test cases

Each case runs against a seeded database with the real logins (receptionist, nurse, doctor, assistant, pharmacist,
lab technician, pathologist, cashier, accountant, OPD admin). A case **passes** only when every step's database check
and every consistency check at the end pass. Use one new patient per case.

Notation: **Actor** · action → **DB check**.

### WF-1 Normal OPD visit (consultation + medicines)

| # | Actor · action | DB check |
|---|---|---|
| 1 | Receptionist · register patient | `Patient` row, unique UHID |
| 2 | Receptionist · issue walk-in token, collect fee (cash) | `OpdVisit` WAITING, `fee_status=PAID`; `DepartmentChargeEvent` (OPD) → `Invoice` + `Payment` on the open `CounterShift` |
| 3 | Nurse · call to triage, record vitals + triage, send | `TriageAssessment`, `VitalSign(visit)`; visit READY_FOR_DOCTOR; `Patient.allergies` updated |
| 4 | Doctor · call in, seat, consult, prescribe 2 medicines, complete | `Consultation` FINAL, `Prescription` + 2 items, visit COMPLETED, `PharmacyDispenseOrder` with `encounter_id` |
| 5 | Assistant · checkout → pharmacy | visit CHECKED_OUT, `checkout_routes=["PHARMACY"]` |
| 6 | Pharmacist · dispense | dispense order DISPENSED, `PharmacyStockTransaction` (−qty), pharmacy charge event |
| 7 | Cashier · collect pharmacy bill | `Invoice` PAID, `BillingReceipt` |
| 8 | Cashier · close shift; Accountant · day close | `CounterShift` closed with totals; `FinancialEvent` / `Journal` for OPD + pharmacy revenue and cash |

Consistency checks: sum of `Payment` for the patient = consultation fee + pharmacy bill; GL debit (cash) = credit
(revenue) for the day; every row carries the same `encounter_id`; visit timeline has issued → checked-out with no gaps.

### WF-1A Same as WF-1, doctor work done by the assistant

Steps 4 performed by the assistant for the doctor. Extra checks: `Consultation.doctor` = doctor,
`performed_by` = assistant, `on_behalf_of` = doctor; appears in doctor's co-sign queue; doctor co-signs →
`co_signed_by` set. Assistant acting for a **non-assigned** doctor → `403`.

### WF-2 OPD + lab tests

| # | Actor · action | DB check |
|---|---|---|
| 1–3 | As WF-1 | |
| 4 | Doctor · order CBC + LFT, "send for tests" | 2 `LabOrder` ORDERED with `encounter_id`; 2 lab charge events; visit AWAITING_REPORTS; draft kept |
| 5 | Nurse · try to collect before payment | `402`, order stays ORDERED |
| 6 | Cashier · collect lab charges | Invoice PAID; `is_lab_sample_collection_allowed` = true |
| 7 | Nurse · collect samples | orders SAMPLE_COLLECTED, barcode, collector |
| 8 | Technician · receive, run, enter results; Pathologist · sign | `LabResult`, `LabReport` approved; one value critical → `CriticalCallback` |
| 9 | Doctor · acknowledge critical | `critical_acknowledged_at/by` |
| 10 | System | visit returns to READY_FOR_DOCTOR when all reports are signed |
| 11 | Doctor · review, complete with prescription | as WF-1 step 4 |
| 12+ | Checkout, pharmacy, billing, accounts as WF-1 | |

Consistency: lab revenue in GL = sum of lab charges; no `LabOrder` without a charge event; no sample collected while
its charge is unpaid.

### WF-3 OPD + treatment room

Doctor prescribes `Inj. Ondansetron` (clinic dose). Nurse gives it with five-rights → `OpdProcedure` GIVEN,
`OPD-PROC-INJECTION` charge. Refused variant → no charge. Cashier collects; GL shows procedure revenue.

### WF-4 OPD + day-care observation

Reception allocates bed → `DaycareStay`; nurse charts 3 readings (one NEWS2 ≥ 7 → escalation alert); doctor round note;
discharge → bed charge by hours; cashier collects; bed freed for housekeeping.

### WF-5 Follow-up

Doctor sets follow-up in 7 days → `OpdFollowUp` PENDING_BOOKING. Assistant books → `Appointment` + follow-up BOOKED.
On the day, receptionist checks in → `OpdVisit` `visit_type=FOLLOW_UP`, follow-up fee charged, follow-up COMPLETED.

### WF-6 Emergency

Receptionist issues emergency token (emergency fee) or nurse marks emergency → priority EMERGENCY, top of every queue;
Code Blue → alert visible on doctor desks; doctor attends → alert ATTENDED; visit proceeds as WF-1.

### WF-7 Admin configuration takes effect

OPD admin: change a doctor's fee → next token charges the new fee (old paid invoices unchanged); block a doctor today →
`POST /visits/` for that doctor refused; turn walk-ins off → walk-in refused, emergency allowed; capacity reached →
warning flag on response. Every change in `OpdAdminAudit`.

### WF-8 Negative and integrity cases

| Case | Expected |
|---|---|
| Issue a second active token for the same patient today | `409` |
| Complete consultation without diagnosis | `400` |
| Dispense before payment (if policy = pay first) | `402` |
| Two doctors' calls for the same visit at once | second gets `409` |
| Retry `complete` with same `Idempotency-Key` | same result, no duplicate prescription/charges |
| Cancel a visit with a paid fee | refund request created in Billing, not silent deletion |
| Day close with an unposted invoice | accounting day close blocked / flagged |

### Consistency report (run after each case and after the full suite)

A management command `python manage.py opd_consistency_check --date=YYYY-MM-DD` that prints and asserts:

1. Every `OpdVisit` COMPLETED has a `Consultation`; every `Prescription` with items has a `PharmacyDispenseOrder`.
2. Every charge event has an invoice item; every invoice item has an `encounter_id` that exists.
3. Total payments (Billing) = total cash/bank debits (Accounts) for the date.
4. Revenue by department in Accounts = Billing revenue by department.
5. No `LabOrder` collected while unpaid; no dispense while unpaid (per policy).
6. Every visit status change has an `OpdVisitEvent`; every assistant action has `on_behalf_of`.

---

## 10. Test execution approach

- **Backend:** `apps/opd/tests/` — model, state machine, permissions (incl. assistant), each API; plus
  `tests/test_workflows.py` running WF-1…WF-8 through the API with `APIClient` logins, ending with the consistency checks.
- **End-to-end UI:** headless Chrome scripts (as used for Reception/OPD) driving each role's real screen through the
  same cases, then calling the consistency command.
- **Data:** run on a copy of the dev DB (`north_hospital.sqlite3` backed up before, restored after), seeded by
  `seed_hospital` + an `opd_seed` command for doctors, chambers, tariffs and assistant assignments.
- **Report:** each run writes a pass/fail table per case and step, plus the consistency report, for sign-off.
