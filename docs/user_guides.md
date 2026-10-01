# North Hospital HMS — Operational User Guides (Level 3 Departments)

This document provides step-by-step operating instructions for hospital clinical and administrative staff across each role.

## Department Login Credentials Cheatsheet

> [!NOTE]
> All demo accounts share the universal password: **`Password123!`**.
> You can also use the **One-Click Quick Login** buttons on the [Login Page](http://localhost:5173/login) for instant access.

| Department / Role | Username / Email | Password | Console URL |
|---|---|---|---|
| **Hospital Admin** | `admin@northhospital.com` | `Password123!` | [Admin Console](http://localhost:5173/admin) |
| **Reception Desk** | `reception@northhospital.com` | `Password123!` | [Reception Console](http://localhost:5173/reception) |
| **Doctor (OPD)** | `doctor@northhospital.com` | `Password123!` | [Doctor OPD](http://localhost:5173/doctor) |
| **Laboratory** | `lab@northhospital.com` | `Password123!` | [Lab Console](http://localhost:5173/lab) |
| **Operation Theatre (OT)** | `surgeon@northhospital.com` | `Password123!` | [OT Console](http://localhost:5173/ot) |
| **Inpatient Care (IPD)** | `ipd@northhospital.com` | `Password123!` | [IPD Console](http://localhost:5173/ipd) |
| **Billing & Accounts** | `billing@northhospital.com` | `Password123!` | [Billing Console](http://localhost:5173/billing) |
| **Nurse Station** | `nurse@northhospital.com` | `Password123!` | [Nurse Station](http://localhost:5173/nurse) |
| **Pharmacy Counter** | `pharmacy@northhospital.com` | `Password123!` | [Pharmacy Console](http://localhost:5173/pharmacy) |
| **Patient Portal** | `patient@northhospital.com` | `Password123!` | [Patient Portal](http://localhost:5173/patient) |

---


## 1. Receptionist & Front Desk Executive
**URL**: [http://localhost:5173/reception](http://localhost:5173/reception)

### A. Registering a New Patient
1. Click **Register New Patient** in the top right header.
2. Complete **Step 1 (Demographics)**: First Name, Last Name, DOB, Gender, Blood Group, Marital status. Optionally link to an existing family UHID.
3. Complete **Step 2 (Identity & Emergency)**: Select Gov ID (Passport, Driver License, National ID) and document number. Enter Emergency contact person and phone number.
4. Complete **Step 3 (Insurance & TPA)**: Select Insurance provider (e.g. BlueCross, Aetna) or Self-Pay, and enter policy member ID.
5. Complete **Step 4 (Consent)**: Confirm signed General OPD Treatment consent and HIPAA acknowledgment.
6. Click **Generate UHID & Register**. The system automatically issues a permanent `UHID-YYYYMM-XXXXX`.

### B. Live Token Queue & Check-In
1. From the **Live Token Queue** tab, review incoming patients.
2. Click **Slip** next to any patient to view or print the official token slip with chamber room and time.
3. When the patient arrives in the waiting lobby, click **Check-In** to notify Nurse Triage and the Doctor.
4. Click **Call Next in Line** to summon the next patient on the lobby overhead display.

### C. Booking Appointment Slots
1. Switch to the **Appointment Scheduling & Slots** tab.
2. Select the doctor from the **Consultant Availability Roster**.
3. Choose an open slot in the 15-minute Morning or Afternoon grid.
4. Click **Confirm Booking & Generate Token**.

---

## 2. Doctor (OPD Station)
**URL**: [http://localhost:5173/doctor](http://localhost:5173/doctor)

### A. Conducting an Outpatient Consultation
1. On the left queue panel (360px), click on the active patient card (status updates to `IN_CONSULTATION`).
2. Review the top demographic banner for documented **drug allergies** (e.g., Penicillin) and **Nurse Vitals** (BP, Heart rate, Temp, SpO2, BMI).
3. Under **Clinical Examination & SOAP**:
   - Record Chief Complaints & History of Illness.
   - Enter Physical examination observations.
   - Enter Primary Diagnosis and ICD-10 code (e.g., `J06.9`).
   - Enter lifestyle advice and recommended follow-up date.
4. Under **E-Prescription (Rx)**:
   - Add medications with Dosage, Frequency (`1-0-1`), Timing (`After/Before Food`), Duration (days), and Total Qty.
5. Under **Lab Orders**:
   - Select diagnostic tests (e.g., CBC, LFT, X-Ray) to immediately route them to the Laboratory Workstation.
6. Click **Finalize Visit & Issue Rx**.

---

## 3. Laboratory Technician & Pathologist
**URL**: [http://localhost:5173/lab](http://localhost:5173/lab)

### A. Specimen Collection & Barcoding (Lab Technician)
1. In the **8-Step Sample Processing Worklist**, locate orders with status `Paid`.
2. Draw the prescribed specimen (e.g., EDTA Whole Blood, SST Serum).
3. Click the **Barcode** icon to open the barcode preview sticker (`BC-2026-XXXX`).
4. Affix the printed barcode to the vacutainer tube and load it into the automated analyzer.

### B. Result Entry & Pathologist Sign-Off
1. Click **Result** to enter observed values against reference ranges.
2. If any parameter falls outside normal limits, the system automatically flags it as **Critical / Abnormal**.
3. The **Pathologist** opens the **Pathologist Approval Station** tab, reviews abnormal findings, enters clinical interpretation remarks, and clicks **Approve & Release Report**.
4. The finalized, digitally signed diagnostic report is now printable and visible in Doctor OPD.

---

## 4. Surgeon, Anesthetist & OT Team
**URL**: [http://localhost:5173/ot](http://localhost:5173/ot)

### A. Scheduling Surgery & Theater Allocation
1. Click **Schedule New Surgery**.
2. Select Patient UHID, Procedure Name, Primary Surgeon, Assistant Surgeon, and Anesthetist.
3. Assign OT Room (OT-1 Major Modular, OT-2 Laminar Flow Ortho, OT-3 Emergency).
4. Verify **PAC Cleared** and **Surgical Consent Signed** checkmarks.

### B. Executing the WHO Surgical Safety Checklist
1. Open the **WHO Surgical Safety Checklist** tab.
2. Complete **Phase 1: Sign In** before anesthesia induction.
3. Complete **Phase 2: Time Out** before surgical incision.
4. Complete **Phase 3: Sign Out** before patient leaves the theater.

### C. Post-Operative Notes & Inpatient Handoff
1. Enter surgical findings, blood loss, and PACU Aldrete stability score.
2. Click **Assign IPD Bed** to transfer the patient to a recovery ward.
3. Click **Send OT Bill to Cashier** to post surgical theater charges into Billing.

---

## 5. Inpatient Ward Manager & Ward Nurse
**URL**: [http://localhost:5173/ipd](http://localhost:5173/ipd)

### A. Inpatient Admission & Bed Allocation
1. Click **Admit Inpatient**.
2. Select Ward (Male Surgical, Female Medical, ICU, Deluxe Suite) and choose an available bed.
3. Record admitting doctor, initial diagnosis, and admission security deposit ($500).
4. View the **Ward & Bed Visual Matrix** where the bed turns from Green (Available) to Blue (Occupied).

### B. Medication Administration Record (MAR)
1. Open the **Medication Administration Record (MAR)** tab.
2. Check scheduled hourly medications (08:00 AM, 02:00 PM, 08:00 PM).
3. After administering the drug to the patient, click **Confirm Dose Given** for digital nurse timestamp sign-off.

### C. Clinical Discharge Summary
1. Click **Discharge** on the inpatient census row.
2. Fill out Hospital Course, Discharge Medications, Condition at Discharge (`Stable & Ambulatory`), and Follow-Up OPD appointment date.
3. Click **Sign & Issue Discharge Summary**.
4. The bed status automatically shifts to Amber (`Cleaning`) for housekeeping, and the final invoice routes to Cashier.

---

## 6. Cashier & Finance Manager
**URL**: [http://localhost:5173/billing](http://localhost:5173/billing)

### A. Consolidated Multi-Source Billing & Payments
1. Open **Patient Invoices & Charges** tab.
2. Click **Settle** on any unpaid or partially paid invoice.
3. The invoice automatically consolidates:
   - Consultation Charges
   - Laboratory Tests
   - OT Room & Surgeon Fee
   - Inpatient Bed Charges $\times$ Days Admitted
   - Pharmacy Dispensed Drugs
4. The system automatically credits previously collected **Inpatient Advance Deposits** (e.g. `-$500.00`).
5. Select payment mode (Cash, Card POS, UPI QR, Insurance TPA), input transaction reference, and click **Confirm Settlement & Issue Receipt**.

### B. Day-End Cashier Handover
1. Switch to the **Cashier Day-End Handover** tab.
2. Review drawer reconciliations across Physical Cash, Card POS, and UPI.
3. Click **Print Shift Handover Summary** and **Close Shift & Lock Drawer**.

---

## 7. Nurse (OPD Triage & Observation Station)
**URL**: [http://localhost:5173/nurse](http://localhost:5173/nurse)  
*Compliant with [NorthHospital HMS Design Bible v1.0](file:///d:/North-Hospital/docs/hms-design-bible.md)*

### A. Triage Queue Management & Patient Calling
1. Open the **1. Triage Queue** tab to inspect real-time patient intake tokens.
2. Review the 4 top KPI cards for **Waiting for Triage**, **In Triage**, **Ready for Doctor**, and **Emergency Priority**.
3. Click the **Volume / Chime** icon next to any incoming token to sound the synthesized booth chime summoning the patient to the triage booth.
4. Click **Start Triage** to transition the patient to `IN_TRIAGE` and automatically transition to the clinical intake form.
5. If a patient exhibits severe distress or chest pain, click the red **Emergency Alert** button to immediately promote their token to `EMERGENCY` priority and bypass the standard OPD queue.

### B. Physiological Vitals & Pre-Consultation Assessment
1. Open the **2. Vitals & Intake** tab and select the patient from the left roster.
2. Input Blood Pressure (Systolic / Diastolic) — the system automatically computes BP staging (`Normal BP`, `Elevated BP`, `Stage 1 HTN`, `Stage 2 HTN`).
3. Record Pulse, Temperature (°F), SpO2 (%), Respiratory Rate, Height (cm), and Weight (kg) — the system calculates real-time BMI and classification.
4. Select the patient's pain level using the 0–10 **Wong-Baker Pain Scale** selector.
5. Record Chief Complaints by clicking pre-configured clinical symptom chips (e.g., *Central Chest Tightness*, *Fever / Chills*).
6. Document known **Drug Allergies**, **Chronic Medical History**, and **Current Medications**.
7. Click **Push to Doctor Chamber Queue** to transition the patient token to `READY_FOR_DOCTOR`, instantly updating the Doctor OPD consultation list.

### C. Day-Care Observation & Telemetry Flowsheets
1. Switch to the **3. Observation Beds** tab to monitor patients under short-stay observation.
2. Select an occupied bed from the left roster to view their admission time and primary diagnosis.
3. Enter hourly telemetry parameters (BP, Pulse, SpO2, Temp, Infusion notes) and click **Log Vital** to update the serial telemetry flowsheet.
4. When stabilization is complete, click **Discharge** to free the observation bed, or **Escalate** to trigger an inpatient ward transfer.

### D. SBAR Clinical Shift Handover & Safety Checklist
1. Open the **4. Doctor Handoff** tab before shift change.
2. Review the **Critical Surveillance Watchlist** showing unstable patients requiring physician alerts.
3. Complete the **SBAR Shift Handover Notes** (Situation, Background, Assessment, Recommendation).
4. Verify the safety checklist (Crash cart sealed, glucometer calibrated, narcotics register signed, defibrillator battery checked).
5. Click **Submit Shift Sign-off** for audit trail logging.

### E. Triage Reports & Quality Audits
1. Open the **5. Reports & Audits** tab to inspect daily intake throughput, average triage duration (< 5m target), and emergency escalation rates.

---

## 8. Laboratory Technician (Workstation)
**URL**: [http://localhost:5173/lab](http://localhost:5173/lab) (Role: `LAB_TECH`)

### A. Test Queue & Specimen Accessioning
1. Default route `/lab` opens the **Test Queue**.
2. Top KPI cards provide live counts for:
   - **Pending Collection**: Samples awaiting bedside phlebotomy or accessioning.
   - **In Analysis**: Samples currently undergoing analyzer processing.
   - **Flagged Abnormal**: Results exceeding biological reference intervals.
   - **TAT Alerts**: Orders approaching turnaround deadline.
3. Filter orders using filter pills: `All`, `Routine`, `STAT (Urgent)`, `Processing`, `Awaiting Review`.
4. Select any patient order row to open **Panel Option B** (Specimen Journey + Parameter Entry).
5. Review the **Specimen Journey** visual tracker (Ordered → Collected → Received in Lab → Processing → Results Entered → Review Pending → Report Signed).
6. Enter observed numerical parameters. As you type, the system automatically:
   - Evaluates reference ranges.
   - Computes biological flags (`NORMAL`, `LOW`, `HIGH`, `CRITICAL`).
   - Checks delta shifts (>20% change compared to patient's previous historical result).
7. Enter optional technician internal notes.
8. Click **Submit for Pathologist Review** to promote status to `RESULTS_ENTERED` / `PENDING_REVIEW`.

### B. Analyzer Register & Equipment Status
1. Navigate to `/lab?tab=equipment`.
2. Inspect the 7 automated laboratory analyzers (Sysmex XN-1000, Roche Cobas 6000, Abbott Architect i2000SR, etc.).
3. If an analyzer is flagged `OFFLINE` or `MAINTENANCE`, the system automatically isolates connected orders and routes tests to backup analyzers.
4. Click **Log Maintenance / Calibration** to record QC runs or service tickets.

---

## 9. Pathologist (Clinical Verification Workstation)
**URL**: [http://localhost:5173/lab](http://localhost:5173/lab) (Role: `PATHOLOGIST`)

### A. Review Queue & Critical Value Management
1. Default route `/lab` opens the **Pathologist Review Queue**.
2. Top KPI cards display: **Pending Sign-off**, **Critical Flagged**, **Abnormal Results**, and **Turnaround Adherence**.
3. Select an order to activate **Panel Option A** (Structured Clinical Review):
   - Review patient demographics, ordering physician, specimen container, and collection timestamp.
   - Inspect observed values against age- and gender-specific reference intervals.
   - Critical values (e.g. Potassium > 6.2 mEq/L) are highlighted in red with delta check comparisons.
4. Pathologist actions:
   - **Flag Critical**: Opens confirmation dialog with a mandatory 15-minute acknowledgment escalation window. Alerts the ordering physician immediately.
   - **Request Re-test**: Opens re-test modal with reason input and technician routing (technician queue or manual pre-dilution). Order status reverts to `IN_ANALYSIS` without charging the patient.
   - **Approve & Sign Off**: Enters pathologist clinical remarks, applies digital signature, changes status to `REPORT_GENERATED` / `REPORT_APPROVED`, and triggers real-time notification across departments.

### B. Signed Reports & Amendments Audit Trail
1. Switch to `/lab?tab=signed-reports`.
2. Review signed reports with delivery status indicators (Doctor Portal, Patient App, Printed).
3. Select a report to view full metadata and the **NABL Audit Trail Timeline**.
4. Click **Issue Amendment** if corrected findings are required; the system creates an amended report version while preserving the original immutable record.
5. Click **Download PDF** or **Print Report** for official NABL-compliant printed reports.

### C. Test Catalog & Clinical Reference Ranges
1. Switch to `/lab?tab=catalog`.
2. Browse active diagnostic tests across Hematology, Biochemistry, Immunoassay, and Microbiology.
3. Select a test to view demographic reference intervals across Adult Male, Adult Female, and Pediatric cohorts.
4. Edit clinical ranges, save drafts, and click **Publish Ranges (v5)** to push updated diagnostic thresholds.
5. *Note: Pricing is strictly read-only for pathologists; fee master modifications are managed by Lab Admin.*

---

## 10. Laboratory Administrator (Department Management)
**URL**: [http://localhost:5173/department/lab](http://localhost:5173/department/lab) (Role: `DEPARTMENT_ADMIN` with `departmentCode === 'LAB'`)

### A. Executive Overview
- `/department/lab?tab=overview`: 5 high-level KPIs, 24-hour hourly workload bar chart (Collected vs Signed-off), TAT compliance progress meters, on-duty staff, analyzer uptime stat cards, and reagent stock alerts.

### B. Staff & Scheduling
- `/department/lab?tab=staff`: Staff directory with roles, clinical competencies, license expiration tracking, and pending leave/shift swap approvals.
- `/department/lab?tab=scheduling`: 7-day weekly roster matrix, coverage rule compliance checker, and 1-click **Fill Roster Gaps** automated shift assignment.

### C. Analyzers & Reagents Inventory
- `/department/lab?tab=equipment`: Equipment register with AMC contracts, maintenance due dates, reagent inventory with min/max stock thresholds, and purchase request approvals.

### D. Pricing & Billing Master Sync
- `/department/lab?tab=pricing`: Rate card table showing Base Price, TPA/Panel Price, STAT Surcharge, and Billing Sync Status.
- Edit base price or STAT surcharge and click **Save & Sync to Billing Master** to instantaneously update the hospital billing system.

### E. Department Settings & Compliance
- `/department/lab?tab=settings`: Anchor sub-navigation for General, Operating Hours, Workflow Rules, Notifications, Printing, and Integrations.
- Enforces NABL digital sign-off lock, critical value escalation window (15 mins), and auto-routing rules.

### F. Reports & Analytics
- `/department/lab?tab=reports`: 30-day timeframe filters, daily volume trends, test distribution by clinical department, top investigations table, and CSV/PDF report downloads.

---

## 11. Cross-Department Laboratory Integration Workflows

### A. Nurse Bedside Specimen Collection & Barcode Labeling
1. In the **Nurse Triage Queue** ([`/nurse?tab=triage-queue`](http://localhost:5173/nurse?tab=triage-queue)), patient rows display live notification pills:
   - `🧪 Specimen Needed: [TestName]`
   - `📄 Lab Report Ready: [TestName]`
2. A top banner alerts staff when bedside collections are pending.
3. Clicking **Collect Specimen** opens the **Bedside Phlebotomy Dossier**:
   - Displays required vacutainer container with color-coded cap chip.
   - Enforces a 3-point pre-collection safety checklist.
   - Renders a **2" x 1" thermal barcode label preview** with printable barcode lines.
   - On confirmation, marks the sample collected and sends it to the central lab.
4. Dedicated **Specimen Desk** ([`/nurse?tab=specimen-desk`](http://localhost:5173/nurse?tab=specimen-desk)) provides full phlebotomy queue management.

### B. Doctor Consultation & Critical Value Sign-Off
1. In the **Doctor Chamber** ([`/doctor`](http://localhost:5173/doctor)), ordering tests dynamically pulls current rates and STAT surcharges from the lab tariff master.
2. If a patient's lab order is flagged critical by a pathologist:
   - A high-priority **Critical Lab Alert Banner** appears at the top of the consultation desk.
   - Clicking the banner opens the **Mandatory Critical Value Acknowledgment Modal**.
   - The physician reviews critical parameters, inputs their clinical therapeutic action note, confirms acknowledgment, and digitally signs off.
3. Under the **Labs** sub-tab, the doctor can click **View Signed Report** to open the full NABL laboratory report.

### C. Doctor Assistant Ante-Room Privacy
1. In the **Doctor Assistant Ante-Room** ([`/assistant`](http://localhost:5173/assistant)), the assistant monitors patient queue tokens with lab status tags (`Report Ready`, `In Analysis`, `Awaiting Collection`).
2. **Privacy Guarantee**: Zero clinical numerical values or findings are visible to the assistant; only operational specimen statuses are displayed.

### D. Billing & Accounts Automatic Charge Capture
1. In the **Billing Department** ([`/billing`](http://localhost:5173/billing)), laboratory tests ordered by doctors or triage nurses automatically appear as billable items under `source: 'Laboratory'`.
2. Dedicated `category: 'LAB'` invoices are generated for standalone walk-in diagnostic investigations.
3. Real-time event listeners ensure invoice balances update instantly when tests are added or settled.
