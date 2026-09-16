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

## 7. Hospital Administrator & Enterprise Setup
**URL**: [http://localhost:5173/admin](http://localhost:5173/admin)

### A. Hospital Profile Master Configuration (7 Tabs)
1. **General Information**: Maintain hospital legal identity, code, classification (Super Specialty, Private, Teaching Hospital), and capacity metrics (Beds, Departments, Doctors, OT Rooms, ICU Beds). Supports Save, Update, Archive, and Audit Trail history.
2. **Contact Details**: Configure direct hotlines for Reception, Emergency, Ambulance, Billing, HR, and IT Support, with one-click Primary line selection and departmental email routing.
3. **Address & Location**: Manage street address, GIS latitude/longitude, direct Google Maps navigation link, and emergency coverage radius (e.g., 15 KM) for rapid ambulance dispatch.
4. **Branding & Documents**: Upload and manage Hospital Logo, Official Seal, Hospital Stamp, and Digital Signature keys. Configure and preview document templates (Prescription, Invoice, Lab Report, Discharge Summary) with A4, Thermal, and Letterhead print formats.
5. **Regulatory & Licenses**: Track mandatory compliance licenses (NABH, JCI, Fire Safety, Biomedical Waste, Pollution Board CTO, Pharmacy License) with document PDF attachments and smart expiry alerts (90, 60, 30 days, Expired).
6. **Operational Settings**: Configure timezone, working shifts, fiscal year, UHID patient prefix (`PAT-000001`), appointment slot durations (15, 20, 30 min), walk-in policies, IPD deposit requirements, and GST billing rules.
7. **Hospital Documents (Central Repository)**: Centralized legal archive for Hospital Registration, NABH Dossiers, Fire NOCs, Insurance/TPA Agreements, Vendor Contracts, SOPs, and Policies with category filtering, upload modals, download actions, and archiving.
