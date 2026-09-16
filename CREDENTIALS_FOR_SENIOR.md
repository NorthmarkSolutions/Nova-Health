# 🏥 North Hospital Enterprise HMS — Senior Demo & Evaluation Handout

### 🌐 Access URLs
- **Web Application URL (Netlify):** `https://<your-netlify-site-name>.netlify.app` *(or local: `http://localhost:5173`)*
- **API Backend (PythonAnywhere):** `https://<your-username>.pythonanywhere.com/api/v1` *(or local: `http://localhost:8000/api/v1`)*
- **Django Administration Console:** `https://<your-username>.pythonanywhere.com/admin`
- **One-Click Demo Login Page:** `https://<your-netlify-site-name>.netlify.app/login`

---

## 🔑 Universal Master Credentials
- **Password for ALL Accounts:** `Password123!`

---

## 📋 Department Roles & Accounts Matrix

| Department / Station | Role Code | Login Email | Quick Login | What to Test |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Hospital Administration** | `HOSPITAL_ADMIN` | `admin@northhospital.com` | `/admin` | Hospital profile, executive KPIs, bed status, tariff setup |
| **1. Reception Desk** | `RECEPTIONIST` | `reception@northhospital.com` | `/reception` | Patient registration, UHID generation, OPD token issuing |
| **2. Outpatient Clinic (OPD)** | `DOCTOR` | `doctor@northhospital.com` | `/doctor` | Queue review, SOAP notes, ICD-10 diagnosis, e-Prescriptions |
| **3. Diagnostic Pathology** | `LAB_TECH` | `lab@northhospital.com` | `/lab` | 5-stage sample tracking (Collected → Processed → Verified) |
| **4. Operation Theatre (OT)** | `SURGEON` | `surgeon@northhospital.com` | `/ot` | Surgical board, WHO surgical safety checklist, recovery |
| **5. Inpatient Care (IPD)** | `WARD_MANAGER` | `ipd@northhospital.com` | `/ipd` | Ward bed allocation, MAR nurse charts, discharge summary |
| **6. Cashier & Accounts** | `CASHIER` | `billing@northhospital.com` | `/billing` | Consolidated invoices, partial payments (UPI/Card), settlement |
| **7. Nurse Station** | `NURSE` | `nurse@northhospital.com` | `/nurse` | Patient vital signs triage, medication administration |
| **8. Pharmacy Dispensary** | `PHARMACIST` | `pharmacy@northhospital.com` | `/pharmacy` | Digital prescription queue, drug inventory & dispensing |
| **9. Patient Portal** | `PATIENT` | `patient@northhospital.com` | `/patient` | Patient personal EHR, appointment history, bills & receipts |

---

## 🚀 Recommended 5-Minute Evaluation Flow
To evaluate the end-to-end integration across departments:
1. Go to **`/login`** and click the **Reception** card $\rightarrow$ click **Register New Patient** $\rightarrow$ generate a UHID and issue an appointment token.
2. In the top/sidebar, click **Logout** and select the **Doctor** card $\rightarrow$ open the newly queued patient $\rightarrow$ enter a diagnosis and prescribe medications.
3. Logout and select the **Laboratory** card $\rightarrow$ advance the patient's lab order to **Validated** / **Report Generated**.
4. Logout and select the **Billing** card $\rightarrow$ locate the consolidated invoice for the patient $\rightarrow$ click **Record Payment** to test partial/full payment and observe the balance update in real time.
