# North Hospital - Department Direct Links & Login Credentials

**Universal Demo Password for All Accounts:** `Password123!`  
**Frontend URL:** http://localhost:5173  
**Backend API (Django REST Framework):** http://localhost:8000/api/v1  
**Django Admin Console:** http://localhost:8000/admin  
**Login Page (With One-Click Login Buttons):** http://localhost:5173/login  

---

## 🏥 Department Quick Login Matrix

| # | Department / Console | Role | Login Email | Password | Direct URL |
|---|----------------------|------|-------------|----------|------------|
| **👑** | **Hospital Admin** | `HOSPITAL_ADMIN` | `admin@northhospital.com` | `Password123!` | [Admin Console](http://localhost:5173/admin) |
| **1** | **Reception Desk** | `RECEPTIONIST` | `reception@northhospital.com` | `Password123!` | [Reception Console](http://localhost:5173/reception) |
| **2** | **Doctor OPD Station** | `DOCTOR` | `doctor@northhospital.com` | `Password123!` | [Doctor OPD Console](http://localhost:5173/doctor) |
| **3** | **Diagnostic Laboratory** | `LAB_TECH` | `lab@northhospital.com` | `Password123!` | [Lab Console](http://localhost:5173/lab) |
| **4** | **Operation Theatre (OT)** | `SURGEON` | `surgeon@northhospital.com` | `Password123!` | [OT Console](http://localhost:5173/ot) |
| **5** | **Inpatient Care (IPD)** | `WARD_MANAGER` | `ipd@northhospital.com` | `Password123!` | [IPD Console](http://localhost:5173/ipd) |
| **6** | **Billing & Accounts** | `CASHIER` | `billing@northhospital.com` | `Password123!` | [Billing Console](http://localhost:5173/billing) |
| **7** | **Nurse Station** | `NURSE` | `nurse@northhospital.com` | `Password123!` | [Nurse Station](http://localhost:5173/nurse) |
| **8** | **Pharmacy Counter** | `PHARMACIST` | `pharmacy@northhospital.com` | `Password123!` | [Pharmacy Console](http://localhost:5173/pharmacy) |
| **9** | **Patient Portal** | `PATIENT` | `patient@northhospital.com` | `Password123!` | [Patient Portal](http://localhost:5173/patient) |

---

## ⚡ How to Log In Easily

1. **Option A — 1-Click Login (Recommended):**
   - Open **[http://localhost:5173/login](http://localhost:5173/login)**
   - Click on any department card on the left panel (e.g. *Reception*, *Doctor*, *Lab*, etc.)
   - It will automatically authenticate against the backend SQLite database and redirect you straight into that department's active console!

2. **Option B — Manual Login:**
   - Enter the **Email** from the table above
   - Enter password: `Password123!`
   - Select the matching role and click **Sign In to Hospital Portal**

---

## 🔄 Patient Lifecycle Walkthrough Test
Test the full patient journey in sequence:
1. **Reception (`reception@northhospital.com`)**: Register patient or generate token → book appointment.
2. **Doctor OPD (`doctor@northhospital.com`)**: Attend queue, write SOAP diagnosis, order Lab CBC / OT / Prescriptions.
3. **Laboratory (`lab@northhospital.com`)**: Collect sample, enter results, pathologist verify & release report.
4. **Operation Theatre (`surgeon@northhospital.com`)**: Schedule surgery, verify WHO checklist, complete & transfer to IPD.
5. **IPD Ward (`ipd@northhospital.com`)**: Assign ward bed, monitor vitals/MAR chart, trigger discharge.
6. **Billing (`billing@northhospital.com`)**: Review unified invoice (OPD + Lab + OT + Bed charges), accept payment & print receipt.