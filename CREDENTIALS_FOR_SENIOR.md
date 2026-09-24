# 🏥 North Hospital Enterprise HMS — Senior Demo & Evaluation Handout

### 🌐 Access URLs
- **Web Application URL:** `http://localhost:5173` *(or your deployed production domain)*
- **Scalable 3-Level Login Portal:** `http://localhost:5173/login`
- **Django Administration Console:** `http://localhost:8000/admin`
- **Cardiology Department Engine:** `http://localhost:5173/department/dept-cardiology`

---

## 🔑 Universal Master Credentials
- **Master Demo Password for ALL Accounts:** `Password123!`

---

## 🏛️ Scalable 4-Tier Hierarchical Authentication Architecture

The login interface is structured into four enterprise tiers to eliminate UI clutter and scale effortlessly across 100+ staff accounts per hospital:

### Level 1: Hospital Facility (Multi-Tenant SaaS Ready)
- **Primary Campus:** North Central Memorial Hospital (`HOSP-NC-01`)
- **Cardiovascular Specialty Pavilion:** North Heart & Vascular Pavilion (`HOSP-NC-02`)
- **Ambulatory & Day Surgery Care:** Northmark Ambulatory Plaza (`HOSP-NC-03`)

### Level 2: Department Station Selection
Select from 12 distinct clinical and administrative units with lean, fixed-height cards:
- **Hospital Admin & Executive** (`ADMIN`)
- **Outpatient Department (OPD)** (`OPD`)
- **Front Desk & Reception** (`RECEPTION`)
- **Inpatient Department (IPD)** (`IPD`)
- **Emergency & Trauma (ER)** (`EMERGENCY`)
- **Operation Theatre (OT Suite)** (`OT`)
- **Intensive Care Unit (ICU / CCU)** (`ICU`)
- **Billing & Financial Accounts** (`BILLING`)
- **Diagnostic Laboratory** (`LAB`)
- **Pharmacy & Dispensing Counter** (`PHARMACY`)
- **Radiology & Imaging Sciences** (`RADIOLOGY`)
- **Cardiology & Cardiovascular Sciences** (`DEPT-CARDIO`)

### Level 3: Staff Role Classification (Cadres)
Decouples staff from department cards by grouping personnel into distinct operational cadres:
- **🩺 Doctors / Consultants**
- **👩‍⚕️ Staff Nurses**
- **📋 Doctor Clinical Assistants**
- **🛎️ Front Desk / Receptionists**
- **🔬 Diagnostic Technicians & Pharmacists**
- **🏢 Administration & Finance**

### Level 4: Staff Authentication & 1-Click Fast Auth
Staff can authenticate using their official **Employee ID** or **Email**, or use the 1-Click fast login button under their selected cadre:

| Department | Role / Station | Employee ID | Login Email | Quick Route |
| :--- | :--- | :--- | :--- | :--- |
| **Hospital Admin** | Hospital Director | `EMP-ADM-001` | `admin@northhospital.com` | `/admin` |
| **Hospital Admin** | Enterprise Super Admin | `EMP-ADM-002` | `admin@northhospital.com` | `/admin` |
| **OPD** | OPD Department Head | `EMP-OPD-ADM` | `opd.admin@northhospital.com` | `/department/opd` |
| **OPD** | Attending Physician | `EMP-DOC-101` | `doctor@northhospital.com` | `/doctor` |
| **OPD** | Doctor Assistant (Chamber 204) | `EMP-AST-204` | `assistant@northhospital.com` | `/assistant` |
| **OPD** | Triage Staff Nurse | `EMP-NUR-001` | `nurse@northhospital.com` | `/nurse?tab=triage-queue` |
| **Reception** | Lead Receptionist | `EMP-REC-001` | `reception@northhospital.com` | `/reception` |
| **Reception** | Front Office Supervisor | `EMP-REC-SUP` | `reception@northhospital.com` | `/reception` |
| **IPD** | Inpatient Ward Manager | `EMP-IPD-001` | `ipd@northhospital.com` | `/ipd` |
| **IPD** | Inpatient Staff Nurse | `EMP-NUR-IPD` | `nurse@northhospital.com` | `/nurse` |
| **Emergency** | ER Department Head | `EMP-ER-001` | `er.admin@northhospital.com` | `/department/3` |
| **Emergency** | Emergency Trauma Nurse | `EMP-ER-NUR` | `nurse@northhospital.com` | `/nurse?tab=triage-queue` |
| **OT Suite** | Chief Consultant Surgeon | `EMP-SURG-01` | `surgeon@northhospital.com` | `/ot` |
| **OT Suite** | Consultant Anesthetist | `EMP-ANES-01` | `surgeon@northhospital.com` | `/ot` |
| **ICU / CCU** | Intensivist Specialist | `EMP-ICU-001` | `doctor@northhospital.com` | `/doctor` |
| **ICU / CCU** | Lead CCU Nurse | `EMP-ICU-NUR` | `nurse@northhospital.com` | `/nurse` |
| **Billing** | Senior Cashier | `EMP-CASH-01` | `billing@northhospital.com` | `/billing` |
| **Billing** | Finance Supervisor | `EMP-FIN-01` | `billing@northhospital.com` | `/billing` |
| **Diagnostic Lab** | Senior Medical Technologist | `EMP-LAB-01` | `lab@northhospital.com` | `/lab` |
| **Diagnostic Lab** | Clinical Pathologist | `EMP-PATH-01` | `lab@northhospital.com` | `/lab` |
| **Pharmacy** | Lead Clinical Pharmacist | `EMP-PHARM-01` | `pharmacy@northhospital.com` | `/pharmacy` |
| **Radiology** | Consultant Radiologist | `EMP-RADIO-01` | `lab@northhospital.com` | `/lab` |
| **Cardiology** | HOD Interventional Cardiologist | `DOC-CARDIO-101` | `cardio.admin@northhospital.com` | `/department/dept-cardiology` |
| **Cardiology** | Cardiac Telemetry Nurse | `EMP-CARD-NUR` | `nurse@northhospital.com` | `/nurse?tab=triage-queue` |

---

## ⚡ Development Mode & 1-Click Fast Login
- Click on any department card on the left panel.
- Click **"N Demo ▼"** to expand the collapsible demo accounts for that department.
- Click **"1-Click"** next to any staff member to instantly authenticate and load their dedicated workstation!
