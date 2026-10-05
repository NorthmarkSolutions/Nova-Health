# Operational Pharmacy Inventory Workspace Specification

**Role:** Inventory Manager (`RoleType.INVENTORY_MANAGER` / Rajesh Kumar · IM-2207)  
**Location:** Central Pharmacy Medical Store (Block B, Basement)  
**Standard:** NorthHospital HMS Design Bible v1.0 & Linear/Stripe Medical Design  
**Governance:** Inventory Manager owns operational execution (medicines, batches, receiving, reorders, transfers, cycle count reconciliation, expiry disposal). Pharmacy Admin owns governance (PR approvals, vendor contracts, pricing revisions).

---

## 1. Master Grid & Layout Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ North Hospital · Pharmacy / Inventory / [Active Module]  ● Live                 [OPD Dispense] [Last sync 08:00] │
├──────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ HEADER BANNER: Inventory Manager Workspace                                                        │
│ (260px)      │ [Receive Stock (GRN)] [+ Add Medicine] [Create Reorders] [Physical Audit]                         │
│              ├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ STOCK        │ ROW 1 KPIs: Total SKUs | Low Stock | Expiring Soon | Pending Approval | Controlled Drugs           │
│ PROCUREMENT  │ ROW 2 KPIs: Pending PRs | Pending Transfers | Dead Stock (>180d) | Stockout Forecast | Exp. Month │
│ MOVEMENTS    ├──────────────────────────────────────────────────────────────────┬────────────────────────────────┤
│ AUDIT & FC   │ MAIN OPERATIONAL TABLE (Flex 1, min 640px)                       │ RIGHT INSPECTION DRAWER        │
│              │ • Module Header & Active Sub-filters                             │ (Sticky 380px)                 │
│ User Footer  │ • Live Search + Column Sort                                      │ • Item / Batch Dossier         │
│ IM-2207      │ • Sticky Header Table (56px rows, badges, quick actions)         │ • FEFO Expiry Timeline         │
│              │ • Pagination & Export (CSV / Print Sheet)                        │ • In-context Action Panel      │
└──────────────┴──────────────────────────────────────────────────────────────────┴────────────────────────────────┘
```

---

## 2. KPI Architecture (2 Rows × 5 Cards = 10 Metrics)

In strict accordance with the HMS Design Bible rule *"Maximum 5 KPI cards in a row"*, the workspace features two dedicated rows:

### Row 1: Stock Health & Valuation (Monitoring Core)
1. **Total SKUs**: Total active items in hospital formulary (`52 active`) with total valuation badge (`₹3,23,377`).
2. **Low Stock**: Items below minimum reorder threshold (`7 items`) with critical out-of-stock badge (`4 out of stock`).
3. **Expiring Soon**: Batches expiring within 90 days (`10 batches`) with valuation at risk (`₹18,940 at risk`).
4. **Pending Approval**: Transactions awaiting Admin sign-off (`2 pending: 1 PR · 1 Adj.`).
5. **Controlled Drugs**: Schedule X and H1 drugs in central vault (`7 items · 12 audit entries`).

### Row 2: Operational Velocity & Risk (Action Core — NEW)
6. **Pending PRs**: Open purchase requisitions in pipeline (`8 PRs: 3 Draft · 5 Submitted`).
7. **Pending Transfers**: Department transfer indents awaiting physical dispatch (`3 transfers: 2 OPD · 1 IPD STAT`).
8. **Dead Stock (>180d)**: Items with zero consumption in >180 days (`6 items · ₹42,100 capital locked`).
9. **Stockout Forecast**: Items projected to exhaust inventory in ≤14 days (`3 items at risk · Earliest in 4 days`).
10. **Expiring This Month**: Immediate risk batches with ≤30 days remaining (`2 batches · Immediate quarantine required`).

---

## 3. Sidebar Navigation & Module Taxonomy

```
STOCK
  ├─ [dash]   Inventory Dashboard        (Items needing action)
  ├─ [master] Medicine Master Master     (Formulary & schedule controls)
  ├─ [ledger] Stock Ledger & Locations   (Stock by warehouse rack/bin)
  ├─ [batch]  Batch Management (FEFO)    (Batch tracking & FEFO ranks)
  ├─ [expiry] Expiry & Quarantine        (Tiered expiry & disposal queue)
  └─ [dead]   Dead Stock (>180 Days)     (Capital lockup analysis)

PROCUREMENT
  ├─ [pr]     Purchase Requests (PR)     (Requisition lifecycle)
  ├─ [appr]   Pending Admin Approval     (Read-only audit view for IM)
  ├─ [grn]    Goods Receipts (GRN)       (Vendor invoice & physical QC)
  └─ [supp]   Supplier Directory         (Contracted vendor performance)

MOVEMENT & DEMAND
  ├─ [demand] Department Demand Hub      (Real-time OPD/IPD queue orders)
  ├─ [tr]     Internal Transfers         (Inter-department distribution)
  └─ [cd]     Controlled Drug Vault      (NDPS dual-sign custody log)

AUDIT & FORECASTING
  ├─ [recon]  Physical Stock Count       (Cycle count & variance tracking)
  └─ [fc]     Usage & Stockout Forecast  (Run-rate burn & cover predictor)
```

---

## 4. Operational Workflows & RBAC Enforcement

### Inventory Manager Ownership Matrix
| Domain | Inventory Manager Actions | Pharmacy Admin Actions |
| :--- | :--- | :--- |
| **Medicine Master** | Add, Edit, Archive, Toggle Formulary, Set Reorder Levels & Schedule | Audit Formulary Revisions |
| **Pricing** | *Read-only* (Displays notice: Governed by Admin/Finance) | Approves Tariff & Price Changes |
| **Batches** | Receive against PO/Direct, Edit Rack Location, FEFO Queue | Audit Batch History |
| **Purchase Requests** | Create Draft PR, Edit Quantities, Submit for Budget Approval | Approve / Reject PR |
| **Suppliers** | View Directory, Lead Time & Fill Rate, Draft Reorders | Onboard / Contract Suppliers |
| **Transfers** | Create, Dispatch, and Receive Stock across Central/OPD/IPD | View Flow Logs |
| **Demand** | View Doctor/Nurse Dispense Queue, Trigger 1-Click Transfers | Operational Oversight |
| **Expiry & Disposal** | Move to Quarantine, Return to Vendor, Destroy Bio-Stock | Co-sign Narcotic Destructions |
| **Stock Reconciliation** | Perform Physical Count, Calculate Variance %, Log Reasons | Review Major Variances (>₹1,000) |
| **Forecasting** | View Run-Rate, Days of Cover, Trigger Auto-Calculated Reorders | Budget Planning |

---

## 5. Modal Specifications (Fixed Box & Fixed Footer)
All modals follow standard fixed dimensions:
- `width: 840px`, `maxWidth: 95vw`, `height: 86vh`, `maxHeight: 820px`, `minHeight: 600px`, `overflow: hidden`.
- Header pinned with title, icon, and close button (`flexShrink: 0`).
- Footer pinned with Back, Cancel, and Primary Save/Submit button (`flexShrink: 0`, `borderTop: 1px solid #E5E7EB`).
- Scrollable tab body in center (`flex: 1`, `overflowY: auto`, `scrollbarWidth: thin`).

### Modals Implemented:
1. **Add / Edit Medicine Modal**:
   - Tab 1: Clinical Identity (Name, Generic, Category, Strength, UOM).
   - Tab 2: Regulatory & Schedule (OTC, H, H1, X, High-Alert, Cold Chain).
   - Tab 3: Stocking Parameters (Min Reorder Level, Auto Reorder Qty, Preferred Supplier, Storage Rack).
2. **Batch Receipt / Create Batch Modal**:
   - Batch number, Mfg Date, Expiry Date, Received Qty, Cost Price, Storage Location, Supplier, QC checklist.
3. **Internal Transfer Modal**:
   - Source Location $\rightarrow$ Destination (OPD Counter 1/2, Central IPD, Emergency Satellite), Medicine, FEFO Batch selection, Quantity, Urgency.
4. **Physical Stock Reconciliation Modal**:
   - Medicine, Batch, System Balance, Physical Count Input, Live Variance & Variance %, Reason Code (*Damaged, Pilferage, Entry Mismatch*), Threshold Warning.
5. **Expiry Disposal Modal**:
   - Action (*Quarantine, Return to Vendor, Bio-Destroy*), Quantity, Witness Staff, Documentation Note.
