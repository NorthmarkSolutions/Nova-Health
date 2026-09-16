# North Hospital Enterprise HMS — Level 3 Departments API Reference

All backend REST endpoints run on `http://localhost:8000` with global route prefix `/api/v1`.
Django Admin Console is accessible at: `http://localhost:8000/admin`.
Authentication is enforced via Bearer JWT token in the `Authorization: Bearer <token>` header.

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Log in with username/email and password to receive JWT |
| `POST` | `/api/v1/auth/register` | Public / Admin | Register a new user with assigned role |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile and doctor metadata |

---

## 2. Reception & Appointments (`/api/v1/appointments`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/appointments` | `RECEPTIONIST`, `ADMIN` | Book appointment and issue sequential token # |
| `GET` | `/api/v1/appointments` | `RECEPTIONIST`, `DOCTOR`, `NURSE`, `ADMIN` | Query appointment queue filtered by date, doctor, or status |
| `GET` | `/api/v1/appointments/:id` | `RECEPTIONIST`, `DOCTOR`, `NURSE`, `CASHIER`, `ADMIN` | Retrieve appointment details with vitals, consultation, and invoice |
| `PUT` | `/api/v1/appointments/:id/status` | `RECEPTIONIST`, `DOCTOR`, `NURSE`, `ADMIN` | Transition status (`WAITING`, `TRIAGED`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`) |
| `POST` | `/api/v1/appointments/:id/vitals` | `NURSE`, `DOCTOR`, `ADMIN` | Record blood pressure, pulse, temp, SpO2, BMI |

---

## 3. Patient Master Directory (`/api/v1/patients`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/patients` | `RECEPTIONIST`, `NURSE`, `ADMIN` | Register patient and generate UHID (`UHID-YYYYMM-XXXXX`) |
| `GET` | `/api/v1/patients` | `RECEPTIONIST`, `DOCTOR`, `NURSE`, `CASHIER`, `ADMIN` | Universal search by UHID, phone number, or patient name |
| `GET` | `/api/v1/patients/:id` | `RECEPTIONIST`, `DOCTOR`, `NURSE`, `CASHIER`, `ADMIN` | Get patient dossier with past appointments and consults |
| `PUT` | `/api/v1/patients/:id` | `RECEPTIONIST`, `NURSE`, `ADMIN` | Update demographics, emergency contact, insurance details |

---

## 4. Outpatient Clinical Station (`/api/v1/clinical`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/clinical/consultations` | `DOCTOR`, `ADMIN` | Save SOAP findings, diagnosis, ICD-10, and issue E-Prescription |
| `GET` | `/api/v1/clinical/prescriptions/:id` | `DOCTOR`, `NURSE`, `PHARMACIST`, `PATIENT`, `ADMIN` | Fetch digital Rx with itemized medication regimen |

---

## 5. Diagnostic Laboratory & Pathology (`/api/v1/lab`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/lab/tests` | `DOCTOR`, `LAB_TECH`, `NURSE`, `ADMIN` | Retrieve hospital diagnostic test catalogue |
| `POST` | `/api/v1/lab/tests` | `LAB_TECH`, `PATHOLOGIST`, `ADMIN` | Add or update test profile and tariff |
| `POST` | `/api/v1/lab/orders` | `DOCTOR`, `ADMIN` | Prescribe lab investigation order |
| `GET` | `/api/v1/lab/orders` | `DOCTOR`, `LAB_TECH`, `PATHOLOGIST`, `NURSE`, `ADMIN` | Get active 8-step specimen worklist |
| `PUT` | `/api/v1/lab/results/:id` | `LAB_TECH`, `PATHOLOGIST`, `ADMIN` | Enter observed parameter values and abnormal flags |

---

## 6. Operation Theatre (`/api/v1/ot`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ot/surgeries` | `SURGEON`, `OT_MANAGER`, `DOCTOR`, `ADMIN` | Schedule surgery with assigned team, theater, and equipment |
| `GET` | `/api/v1/ot/surgeries` | `SURGEON`, `ANESTHETIST`, `OT_MANAGER`, `NURSE`, `ADMIN` | Retrieve master OT schedule board (filter by room, date, status) |
| `GET` | `/api/v1/ot/surgeries/:id` | `SURGEON`, `ANESTHETIST`, `OT_MANAGER`, `NURSE`, `ADMIN` | Get surgical booking with pre-op notes and assigned equipment |
| `PATCH` | `/api/v1/ot/surgeries/:id/status` | `SURGEON`, `ANESTHETIST`, `OT_MANAGER`, `ADMIN` | Advance surgical stage (`PLANNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `POST_OP_RECOVERY` $\rightarrow$ `TRANSFERRED_TO_IPD`) |
| `PATCH` | `/api/v1/ot/surgeries/:id/notes` | `SURGEON`, `ADMIN` | Record intra-op findings and post-operative instructions |

---

## 7. Inpatient Care (IPD) (`/api/v1/ipd`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ipd/admissions` | `WARD_MANAGER`, `DOCTOR`, `ADMIN` | Admit patient into allocated ward and bed |
| `GET` | `/api/v1/ipd/admissions` | `WARD_MANAGER`, `NURSE`, `DOCTOR`, `ADMIN` | Active inpatient census filtered by ward or status |
| `GET` | `/api/v1/ipd/admissions/:id` | `WARD_MANAGER`, `NURSE`, `DOCTOR`, `ADMIN` | Detailed inpatient record with MAR and vitals |
| `PATCH` | `/api/v1/ipd/admissions/:id/status` | `WARD_MANAGER`, `DOCTOR`, `ADMIN` | Update inpatient status (`POST_OP`, `OBSERVATION`, `DISCHARGE_INITIATED`) |
| `GET` | `/api/v1/ipd/admissions/:id/mar` | `NURSE`, `DOCTOR`, `WARD_MANAGER`, `ADMIN` | Retrieve scheduled Medication Administration Records (MAR) |
| `POST` | `/api/v1/ipd/mar` | `NURSE`, `DOCTOR`, `ADMIN` | Add scheduled dose or stat medication to chart |
| `PATCH` | `/api/v1/ipd/mar/:id/toggle` | `NURSE`, `ADMIN` | Toggle medication administered status with nurse digital sign-off |
| `POST` | `/api/v1/ipd/admissions/:id/discharge` | `DOCTOR`, `WARD_MANAGER`, `ADMIN` | Complete discharge with clinical course, discharge Rx, and bed release |

---

## 8. Billing & Accounts (`/api/v1/billing`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/billing/invoices` | `CASHIER`, `RECEPTIONIST`, `ADMIN` | Generate consolidated invoice aggregating Consultation, Lab, OT, Bed & Pharmacy charges |
| `GET` | `/api/v1/billing/invoices` | `CASHIER`, `RECEPTIONIST`, `ADMIN` | List and filter invoices by payment status |
| `GET` | `/api/v1/billing/invoices/:id` | `CASHIER`, `RECEPTIONIST`, `PATIENT`, `ADMIN` | Get itemized invoice breakdown with taxes, discounts, and payments |
| `POST` | `/api/v1/billing/payments` | `CASHIER`, `ADMIN` | Record payment transaction (Cash, POS Card, UPI, Insurance) and settle invoice |
