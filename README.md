# 🏥 North Hospital Enterprise HMS

A modern, full-stack Hospital Management System (HMS) built with a **Python / Django REST Framework** backend and a high-performance **React + TypeScript** frontend. Designed for complete hospital operations across 10 specialized departments.

---

## 🏗️ Architecture

- **Backend (`/backend`)**:
  - Python 3.10+ / Django 5.1 & Django REST Framework (DRF)
  - JWT Authentication via `djangorestframework-simplejwt`
  - Domain Apps: `accounts`, `organization`, `patients`, `appointments`, `clinical`, `lab`, `ot`, `ipd`, `billing`, `audit`
  - Automated seeding command: `python manage.py seed_hospital`
- **Frontend (`/frontend`)**:
  - React 18 + TypeScript + Vite
  - Lucide Icons & Tailwind-free custom CSS design system
  - 10 Department Portals with One-Click Demo Logins
  - SPA routing ready for Netlify (`_redirects`, `netlify.toml`)

---

## 🚀 Quick Start (Local Development)

### 1. Start Django Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_hospital
python manage.py runserver 0.0.0.0:8000
```

### 2. Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Login Credentials
**Universal Password for ALL Demo Accounts:** `Password123!`

| Role / Department | Login Email | Console URL |
| :--- | :--- | :--- |
| **Hospital Admin** | `admin@northhospital.com` | `/admin` |
| **Reception Desk** | `reception@northhospital.com` | `/reception` |
| **Doctor OPD** | `doctor@northhospital.com` | `/doctor` |
| **Diagnostic Lab** | `lab@northhospital.com` | `/lab` |
| **Operation Theatre** | `surgeon@northhospital.com` | `/ot` |
| **Inpatient Care (IPD)** | `ipd@northhospital.com` | `/ipd` |
| **Cashier & Billing** | `billing@northhospital.com` | `/billing` |
| **Nurse Station** | `nurse@northhospital.com` | `/nurse` |
| **Pharmacy Counter** | `pharmacy@northhospital.com` | `/pharmacy` |
| **Patient Portal** | `patient@northhospital.com` | `/patient` |

---

## 🌐 Production Deployments
- **Backend**: Ready for PythonAnywhere (see [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md))
- **Frontend**: Ready for Netlify
