# NorthHospital HMS — Pharmacy Visual Specification

**Document Version:** 2.0  
**Design Standard:** Strict adherence to `hms-design-bible.md`  
**Target Resolution:** Desktop 1440px / 1920px (Responsive down to 1024px)  

---

# 1. Design Vision & Philosophy

The Pharmacy module must look like a high-performance clinical logistics tool — calming, spacious, high-contrast, and fast. Pharmacists process high volumes under strict time pressures; visual clutter or nested cards increase error rates.

### Target Feel:
- **Calm & Professional:** White and soft gray surfaces (`#FFFFFF`, `#F9FAFB`).
- **High Information Clarity:** Clear typography hierarchy, bold status indicators.
- **Large Click Targets:** 40px inputs, 40px buttons, 56px table rows.
- **Strict Visual Discipline:** Maximum 5 KPI cards in a row; maximum 3 content columns; zero nested cards inside cards.

---

# 2. Design Tokens & Styling Constants

### Typography (Inter)
- **Workspace Title (H1):** `32px` | Weight: `700` | Color: `#111827`
- **Section Heading (H2):** `24px` | Weight: `600` | Color: `#111827`
- **Subheading (H3):** `20px` | Weight: `600` | Color: `#111827`
- **Card Title:** `16px` | Weight: `600` | Color: `#111827`
- **Body Text:** `14px` | Weight: `400` | Color: `#374151`
- **Small / Metadata:** `13px` | Weight: `500` | Color: `#6B7280`
- **Micro Badge / Caption:** `12px` | Weight: `600` | Color: `#6B7280`

### Color Palette
- **Primary Action:** `#2563EB` (Royal Blue) | Hover: `#1D4ED8`
- **Success / Dispensed:** `#16A34A` (Green) | Background: `#F0FDF4` | Border: `#BBF7D0`
- **Warning / Hold:** `#F59E0B` (Amber) | Background: `#FFFBEB` | Border: `#FDE68A`
- **Danger / Allergy / Narcotic:** `#DC2626` (Red) | Background: `#FEF2F2` | Border: `#FECACA`
- **Info / Routing:** `#0EA5E9` (Sky Blue) | Background: `#F0F9FF` | Border: `#BAE6FD`
- **Card Border:** `1px solid #E5E7EB`
- **Card Border Radius:** `12px`
- **Card Shadow:** `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)`

---

# 3. Screen Specifications

## Screen 1: OPD Dispensing Queue (`/pharmacy?view=opd`)

### 1. Header Area
- **Title:** OPD Dispensing Queue
- **Description:** Live outpatient prescription orders from clinical consultation chambers.
- **Top Actions:** `[+ Quick OTC Sale]` (Primary Blue), `[Process Return]` (Secondary), `[Refresh Queue]` (Ghost).

### 2. KPI Cards (Row of 4, Height 120px)
1. **Pending Verification:** Icon `Clock` | Metric: `14` | Subtext: `Waiting for review` | Color: Blue `#2563EB`
2. **Awaiting Stock:** Icon `AlertTriangle` | Metric: `2` | Subtext: `Zero inventory hold` | Color: Amber `#F59E0B`
3. **Dispensed Today:** Icon `CheckCircle2` | Metric: `68` | Subtext: `+12% vs yesterday` | Color: Green `#16A34A`
4. **Allergy Overrides:** Icon `ShieldAlert` | Metric: `1` | Subtext: `Audited by MD` | Color: Danger `#DC2626`

### 3. Filter Bar
- Search Input: `320px` width, placeholder: "Search patient name, UHID, Rx number..."
- Filter Pills: `[All (84)]` | `[Pending (14)]` | `[On Hold (2)]` | `[Dispensed (68)]`

### 4. Table Structure (`56px` row height)
| Column | Width | Format | Example |
|:---|:---|:---|:---|
| **Patient** | 24% | Avatar + Name (bold 14px) + UHID (gray 12px) | `Eleanor Vance` • `UHID-202610-00045` |
| **Prescription** | 16% | Rx Number + Time ago | `RX-202610-0012` • `10m ago` |
| **Prescribing Doctor** | 20% | Doctor Name + Department | `Dr. Sarah Jenkins` • `Cardiology` |
| **Medications** | 22% | Item count pill + truncated drug names | `3 Items` • Atorvastatin, Metoprolol... |
| **Status** | 10% | Colored StatusBadge | `Pending`, `On Hold`, `Dispensed` |
| **Action** | 8% | Primary small button | `[Open Rx ↗]` |

---

## Screen 2: Quick OTC Walk-in Sale Modal (Width: `480px`)

Triggered by `[+ Quick OTC Sale]`.
- **Header:** `Counter Over-the-Counter (OTC) Sale`
- **Customer Section:**
  - Customer Name input: "e.g. Robert Sterling"
  - Customer Phone input: "+1 555-019-2834"
- **Formulary Selection:**
  - Search box: "Search non-prescription items..."
  - Pre-filtered to `requires_prescription = False`
  - Item selector + Quantity input + Live Stock pill
- **Payment Method Toggle:** `[Cash]` `[Card]` `[UPI]` `[Send to Cashier]`
- **Footer:** Total amount: `$14.50` | `[Cancel]` | `[Dispense & Print Receipt]`

---

## Screen 3: Prescription Detail Drawer (Width: `580px`)

### 1. Drawer Header (`64px` height)
- Patient Name (18px bold) & UHID (13px monospace)
- Prescribing Doctor name & chamber tag
- Close button `[✕]` (top right)

### 2. Patient Demographics & Allergy Banner
- Age, Gender, Weight, Blood Group chips.
- **Allergy Check Banner:**
  - *Clean State:* Light green background (`#F0FDF4`), Green border, Icon `ShieldCheck`: "No known drug allergies detected in patient dossier."
  - *Conflict State:* Light red background (`#FEF2F2`), Red border, Icon `AlertOctagon`:
    `CRITICAL WARNING: Patient has registered Penicillin allergy. Prescribed Amoxicillin 500mg has direct cross-reactivity.`

### 3. Itemized Medication Cards
Each prescribed item is rendered in a dedicated card (`padding: 16px`, `border: 1px solid #E5E7EB`):
- Medicine Name & Strength (15px bold, e.g. "Atorvastatin 20mg")
- Controlled Substance Tag (if narcotic): Amber `[SCHEDULE X - DUAL SIGN-OFF REQUIRED]`
- Dosage & Regimen: `1 Tablet` • `Once daily (Night)` • `30 Days`
- Prescribed Quantity: `30 Tablets`
- **Stock Availability Section (READ-ONLY PREVIEW):**
  - In Stock: `Available: 140 Tabs (Batch: B-2026-92, Exp: Jun 2027)`
  - Out of Stock: `Zero stock in central stores (Awaiting inbound)`
  - *Inventory Note:* Stock levels remain 100% untouched during verification. Batches are decremented only upon clicking `[Dispense & Bill]`.
- Price preview: `$18.00 ($0.60 / tab)`

### 4. Settlement Mode Selector & Adaptive Billing Controls

Located directly below the itemized medication list, this interactive section determines the financial ledger destination:

- **Settlement Mode Pills (Segmented Selector):**
  `[Pay at Pharmacy]` | `[Pay at Reception]` | `[Insurance]` | `[Corporate]` | `[Credit]` | `[IPD Running Bill]`
  - *Contextual Default:* OPD consultations default to `Pay at Pharmacy` (or auto-switches to `Insurance` or `Corporate` if flagged in the patient's registration dossier).
  - *IPD Inpatient Mode:* Locked to `[IPD Running Bill]` with a blue lock badge.

#### Adaptive Sub-Panels per Selected Mode:

**A. Mode: Pay at Pharmacy**
- Payment Method Toggle: `[Cash]` `[Card]` `[UPI / QR]`
- Tendered Cash input: `[$50.00]` ──► Dynamic Change Display: `Change to Return: $7.50`
- UPI Dynamic QR: Generates 200px counter QR code with live settlement status listener.
- Summary Breakdown:
  - Subtotal: `$40.00` | GST (5%): `$2.00` | Discount: `$0.00`
  - **Net Payable at Counter:** `$42.50`

**B. Mode: Pay at Reception / Central Billing**
- Handover Policy Radios:
  - `(•) Pre-Paid Handover` *(Patient pays at reception cashier before receiving bag; queue updates to green `PAID`)*
  - `( ) Post-Paid Handover` *(Medicines handed over immediately; exit security barrier checks clearance)*
- Token Slip Preview: `Token # PH-8821` with high-density Code-128 Barcode.
- Notice: *"Charges will be consolidated with Dr. Consultation on Central Reception Invoice."*

**C. Mode: Insurance (TPA Pre-Authorization)**
- TPA Network Selector: `[ Star Health Insurance ▾ ]`
- Policy Number: `[ STAR-POL-8839210 ]`
- Pre-Auth Approval Code: `[ AUTH-2026-88192 ]`
- Co-Pay Split Card (`background: #F8FAFC`, `border: 1px solid #E2E8F0`):
  - Total Prescribed Value: `$42.50`
  - TPA Covered (Admissible 80%): `$34.00` *(Queued for Insurance TPA Claims Desk)*
  - Patient Co-Pay (20%): `$8.50`
- Patient Co-Pay Settlement: `[Pay at Pharmacy]` or `[Pay at Reception]`

**D. Mode: Corporate / Institutional Sponsorship**
- Empanelled Corporate Partner: `[ Tech Mahindra Wellness Program ▾ ]`
- Employee ID / Beneficiary #: `[ TM-EMP-40192 ]`
- Authorization Letter Ref: `[ AUTH-LTR-OCT-44 ]`
- Digital Stylus Signature Pad: `[ Tap to sign voucher on counter pad ]`
- Status Tag: `B2B Direct Invoicing - Net 30`

**E. Mode: Hospital Credit Facility**
- Account Category: `[ Hospital Staff Allowance ▾ ]` (or `VIP Courtesy Line`, `Emergency Life-Saving`)
- Available Credit Limit Pill: `$450.00 Available Balance`
- Authorizing Official: `[ Dr. Kevin Vance, Medical Superintendent ▾ ]`
- Authorization Pin / Passcode: `[ •••••• ]`
- Ledger Notice: *"Amount will be debited to staff payroll deduction schedule."*

**F. Mode: IPD Running Bill**
- Linked Admission ID: `ADM-202610-0018` • `ICU Suite - Bed 02`
- Advance Deposit Health Card:
  - Collected Advance: `$2,500.00`
  - Current Inpatient Bill: `$1,940.00`
  - Adding Pharmacy: `+$42.50` ──► New Running Total: `$1,982.50` (79.3% utilized)
- Notice: *"Charges atomically sync to Inpatient Census. Settled at final discharge."*

---

### 5. Sticky Drawer Footer
- Left: Total Billable Amount preview: `Total: $42.50` (Or `Co-Pay: $8.50` if Insurance)
- Right Action Group:
  - `[Hold Rx]` (Secondary button — leaves inventory untouched)
  - `[Override Allergy]` (Danger outline button — only visible if conflict detected)
  - `[Dispense & Bill]` (Primary blue button, 40px height) — **The sole mutation trigger**: Atomically decrements batch stock in `pharmacy_batches` and creates/updates the selected billing record.

---

## Screen 4: IPD Medication Request Queue (`/pharmacy?view=ipd`)

### 1. Execution Order & Billing Safeguard
```
Ward Request ──► Issue ──► Admission Ledger Update
```
- **The Core Rule:** When an IPD Pharmacist clicks `[Issue to Ward ↗]`, the system executes an atomic transaction: decrements central pharmacy batch stock, updates the Inpatient MAR to `READY_TO_ADMINISTER`, and **immediately posts line items into the Inpatient Admission running bill** (`category: IPD`, `source: Pharmacy`).
- Zero cash is collected at issue; the admission ledger update prevents unbilled medications at patient discharge.

### 2. Queue Layout & Controls
- Table replaces "Doctor" with **Ward & Bed** (`ICU • Bed 02`, `Ward A • Bed 14`).
- Settlement Mode is permanently hard-coded to **IPD Running Bill**.
- Real-time Advance Deposit status pill: `Deposit Healthy (64%)` or `Low Advance Warning (88%)`.
- Primary Action button: `[Issue to Ward ↗]`.
- Status values: `Pending Issue`, `Issued to Ward`, `MAR Administered`.

---

## Screen 5: Inventory Dashboard & Procurement (`/pharmacy?view=inventory`)

### 1. Header Area
- **Title:** Pharmacy Inventory & Procurement
- **Description:** Central stores ledger, purchase requisitions, batch FEFO tracking, and goods receipt.
- **Top Actions:** `[+ New Purchase Request]` (Primary Blue), `[Receive Stock (GRN)]` (Secondary), `[Controlled Drug Log]` (Ghost).

### 2. KPI Cards (Row of 5, Height 120px)
1. **Low Stock SKUs:** Metric: `4` | `Below reorder threshold` | Color: `#F59E0B`
2. **Expiring < 30 Days:** Metric: `2` | `Urgent stock rotation` | Color: `#DC2626`
3. **Pending PRs:** Metric: `3` | `Awaiting Admin Approval` | Color: `#2563EB`
4. **Active Batches:** Metric: `184` | `Central warehouse` | Color: `#16A34A`
5. **Turnover (Today):** Metric: `$4,820` | `Dispensed value` | Color: `#0EA5E9`

### 3. Procurement Tab View
- **Sub-Tabs:** `[Stock Ledger]` | `[Purchase Requests]` | `[Purchase Orders]` | `[Suppliers]`
- **Purchase Request Table:**
  - PR #, Date, Requested By, Priority, Total Estimated Value, Status (`SUBMITTED`, `APPROVED`, `CONVERTED_TO_PO`), Actions (`[Review / Approve]` for Admin, `[View Details]` for Manager).

---

## Screen 6: Receive Stock Drawer (Goods Receipt Note - GRN)

Triggered by `[Receive Stock (GRN)]`.
- **Drawer Width:** `600px`
- **Fields:**
  - Select Purchase Order (or Direct Supplier Invoice)
  - Supplier Name & Supplier Invoice Number
  - Batch Entry Grid:
    - Medicine SKU
    - Manufacturer Batch / Lot Number
    - Manufacturing Date & Expiration Date
    - Received Quantity & Cost Price
    - Storage Location (`Rack A-01`, `Cold Chain Refrigerator 2-8°C`)
- **Primary Action:** `[Post Inbound Shipment & Update Batches]`

---

## Screen 7: Process Medication Return Drawer (Width: `540px`)

Triggered by `[Process Return]`.
- **Header:** `Process Patient / Ward Return`
- **Search:** "Enter original Dispense Order # (e.g. DSP-202610-00042)"
- **Verification Checklist:**
  - `[x] Packaging is factory sealed and unadulterated`
  - `[x] Not a cold-chain / temperature-sensitive medication`
  - `[x] Within hospital 48-hour return policy window`
- **Line Items:** Checkbox per returned drug, quantity returned, Restock vs Quarantine selector.
- **Footer:** Estimated Refund Credit Note: `$18.00` | `[Confirm Return & Issue Credit Note]`

---

## Screen 8: Controlled Drug Register (Statutory Modal / Drawer)

- **Header:** `Statutory Controlled Drug & Narcotic Dispense Record`
- **Dual Sign-Off Form:**
  - Medication & Batch: `Morphine Sulfate 10mg/mL (Batch: MOR-2026-08)`
  - Prescribing Doctor: `Dr. Kevin Vance, MD (Registration: MCI-SURG-88192)`
  - Primary Dispenser: `Sarah Connor, R.Ph`
  - Witness Verification:
    - Select Witness: `[Nurse Priya Sharma, RN - ICU Lead]`
    - Witness Authentication: Password / PIN verification
- **Running Vault Balance:** `Current: 24 Vials` ──► `After Dispense: 22 Vials`
- **Primary Action:** `[Sign & Record Controlled Dispense]` (Danger filled button `#DC2626`)

---

## Screen 9: Pharmacy Department Admin Workspace (`/department/pharmacy`)

The central executive command center for the Pharmacy Director / Department Administrator. Designed around oversight, approvals, and governance without operational dispensing clutter.

### 1. Workspace Sub-Tabs
`[Operations Monitor]` | `[Procurement Approvals]` | `[Reports & Financials]` | `[Staff & Shifts]` | `[Formulary Pricing]` | `[Suppliers]`

### 2. Available Admin Capabilities (What Admin CAN Do)
1. **Procurement Approvals Tab:**
   - Review pending Purchase Requests (PRs) submitted by the Inventory Manager.
   - Action buttons: `[Approve PR & Generate PO]`, `[Reject PR with Notes]`.
   - Dispatch approved POs directly to suppliers with expected delivery dates.
2. **Operations Monitor Tab:**
   - Real-time departmental throughput KPI cards (OPD Queue Length, IPD Ward Fulfillment Times, Stockout Warnings, Daily Revenue).
   - Read-only live view of prescription queues across OPD and IPD.
3. **Reports & Financials Tab:**
   - Revenue analytics, gross margin breakdown, formulary consumption trends.
   - Statutory Controlled Substance Register audit log and expiry write-off audit.
4. **Staff & Shifts Tab:**
   - Assign staff to roles (`OPD_PHARMACIST`, `IPD_PHARMACIST`, `INVENTORY_MANAGER`).
   - Manage shift rotations (Morning, Evening, Night) and leave cover.
5. **Formulary Pricing & Suppliers Tabs:**
   - Set retail prices, manage contractual TPA insurance schedules, and approve supplier vendors.

### 3. Separation of Concerns (What Admin CANNOT Do)
- ❌ **No Dispense Button:** Admin cannot dispense medications to outpatients (restricted to `/pharmacy?view=opd` for licensed OPD Pharmacists).
- ❌ **No Issue Button:** Admin cannot issue medications to inpatient wards (restricted to `/pharmacy?view=ipd` for IPD Pharmacists).
- ❌ **No Stock Adjustment / GRN Button:** Admin cannot register received batches or alter inventory stock numbers (restricted to `/pharmacy?view=inventory` for Inventory Managers to maintain audit anti-fraud compliance).

