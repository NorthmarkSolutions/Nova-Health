# NorthHospital HMS Design Bible

Version: 2.0 · 11 Oct 2026

---

> **For AI agents and developers — read this first.**
> When asked to "follow the HMS bible" for a department, apply **Section 19 (Department Workspace Standard)** to that department's workspace, using **Section 20 (Apply Checklist)** step by step.
> Section 19 is the implemented standard (reference implementation: Pharmacy Admin Workspace, `frontend/src/pages/pharmacy/admin/PharmacyAdminWorkspace.tsx`).
> **If any older rule in Sections 1–18 conflicts with Section 19, Section 19 wins.**

---

# 1. Design Vision

NorthHospital HMS should look like a premium SaaS product rather than a traditional hospital software.

Target Feel:

- Modern
- Clean
- Spacious
- Enterprise Grade
- Calm
- Professional
- Fast
- Medical Workflow Focused

Reference Inspiration:

- Linear
- Stripe Dashboard
- Notion
- Vercel
- Modern Analytics Platforms

Avoid:

- Crowded layouts
- Too many colors
- Heavy borders
- Tiny text
- Nested cards inside cards
- Old ERP appearance

---

# 2. Core Design Principles

1. White space is a feature.

2. Every screen should breathe.

3. Information hierarchy must be obvious.

4. Cards before tables whenever possible.

5. Exactly 4 KPI cards in a row on every workspace (see Section 19.5).

6. Maximum 3 content columns.

7. Large click targets.

8. Consistent spacing across all screens.

9. Same components reused everywhere.

10. One visual language across Reception, Doctor, Nurse, Lab, Pharmacy and Admin.

---

# 3. Layout System

Page Container

Max Width:
100%

Content Padding:
24px

Section Gap:
24px

Card Gap:
16px

Grid Gap:
16px

---

# 4. Sidebar Rules

Width:
260px

Background:
#FFFFFF

Border Right:
1px solid #E5E7EB

Structure:

Logo

Workspace Information

Navigation

User Profile

Logout

Rules:

Only one active item.

Icons 18px.

Text 14px.

Never overcrowd sidebar.

Full sidebar specification (structure, grouping, sizes, states, counts): **Section 19.2**.

---

# 5. Header Rules

Every workspace must contain:

Page Title

Short Description

Primary Actions

Optional Filters

Example:

Doctor Dashboard

Today's appointments, queue status and clinical workload.

[Call Next]
[Schedule]
[Reports]

Full top bar, profile control and page header specification: **Sections 19.3 and 19.4**.

---

# 6. Typography

Font Family:

Inter

Fallback:

sans-serif

---

H1

32px
700

---

H2

24px
600

---

H3

20px
600

---

Section Title

18px
600

---

Card Title

16px
600

---

Body

14px
400

---

Small Text

13px

---

Caption

12px

---

# 7. Colors

Primary

#2563EB

Success

#16A34A

Warning

#F59E0B

Danger

#DC2626

Info

#0EA5E9

---

Gray Scale

Gray-50
#F9FAFB

Gray-100
#F3F4F6

Gray-200
#E5E7EB

Gray-500
#6B7280

Gray-900
#111827

---

# 8. Cards

Primary Design Element

Background:
White

Border:
1px solid #E5E7EB

Radius:
12px

Shadow:
Soft only

Padding:
20px

Never:

Use thick borders

Use bright colors

Use gradients inside cards

---

# 9. KPI Cards

Structure:

Icon

Metric

Label

Trend

Example:

245

Today's Patients

+8%

Rules:

Height:
120px

Clean

Minimal

Easy scanning

Full KPI specification (exactly 4, clickable, no invented values): **Section 19.5**.

---

# 10. Tables

Use only when required.

Preferred:

Cards

Lists

Timeline

Use tables only for:

Patients

Billing

Reports

Inventory

Table Rules:

Sticky Header

Row Height:
56px

Hover State

Pagination

Search

Filters

---

# 11. Forms

Maximum Width:
800px

Label Above Input

Input Height:
40px

Field Gap:
16px

Section Gap:
24px

Avoid giant forms.

Split large forms into sections.

---

# 12. Buttons

Primary

Blue Filled

---

Secondary

White

Border

---

Danger

Red

---

Ghost

Text Only

---

Radius:
10px

Height:
40px

Full button specification (font, sizes, icons, shortcut chips): **Section 19.7**.

---

# 13. Screen Structure

Every Screen Must Follow:

1 Header

2 KPI Cards

3 Primary Content

4 Secondary Content

5 Action Area

Never:

Header

Header

Cards

Cards

Cards

Cards

Cards

Cards

Cards

Cards

Table

Table

Table

This creates clutter.

---

# 14. Workspace Templates

## Reception

Header

KPI Cards

Queue

Booking

Billing

Patient Search

---

## Doctor

Dashboard

Queue

Consultation

Schedule

Reports

---

## Nurse

Triage

Vitals

Observation

Doctor Handoff

Reports

---

## Doctor Assistant

Patient Queue

Doctor Support

Lab Tracking

Consultation Handoff

Communication

---

## Department Admin

Overview

Staff

Doctors

Rooms

Schedules

Reports

---

## Hospital Admin

Buildings

Departments

Staff

Finance

Analytics

Settings

---

# 15. Consultation Screen Rules

Most Important Screen

Layout:

3 Columns

Left Panel

20%

Center Panel

55%

Right Panel

25%

---

Left

Patient Details

Vitals

Allergies

History

Past Visits

---

Center

Chief Complaint

Examination

Diagnosis

Clinical Notes

Prescription

---

Right

Lab Reports

Radiology

Previous Prescriptions

Alerts

---

Never place everything in one giant form.

---

# 16. Dashboard Style

Inspired by Reference Image

Characteristics:

Large whitespace

Large cards

Rounded corners

Minimal shadows

Soft gray backgrounds

Clean analytics appearance

Professional SaaS feel

---

# 17. Future Modules

Design must support:

IPD

OT

Emergency

Lab

Radiology

Pharmacy

Billing

Insurance

Inventory

HR

Payroll

Analytics

without changing visual language.

---

# 18. Development Rules

Before creating any screen:

1 Read this file.

2 Reuse existing components.

3 Follow typography exactly.

4 Follow spacing exactly.

5 Follow card system exactly.

6 Follow dashboard style exactly.

7 Prefer whitespace over density.

8 Maintain consistency across all departments.

9 Do not invent new UI patterns.

10 If unsure, match the reference dashboard style.

11 Department workspaces follow Section 19 exactly.

---

# 19. Department Workspace Standard (v2 — mandatory)

Every department workspace (Pharmacy, Lab, Radiology, Billing, Accounts, IPD, OT, Reception, Nurse, Doctor Assistant, Department Admin, Hospital Admin …) uses the same shell and the same five building blocks, in this order:

```
┌──────────┬───────────────────────────────────────────────────────────┐
│          │ 19.3 Top bar: breadcrumb · status chips · Shortcuts · Profile │
│  19.2    ├───────────────────────────────────────────────────────────┤
│ Sidebar  │ 19.4 Page header: title · description · 1–3 actions        │
│ 260px    │ 19.5 KPI row: exactly 4 equal cards                        │
│          │ 19.6 Main: Left box (~30%)  │  Right box (~70%)            │
└──────────┴───────────────────────────────────────────────────────────┘
```

Reference implementation: `frontend/src/pages/pharmacy/admin/PharmacyAdminWorkspace.tsx`. When this document is silent, copy what that file does.

Keep each department's own menu items, data, permissions, routes and workflows. Only the layout and visual language change.

---

## 19.1 Design Tokens

Font: `'Inter', sans-serif` on the workspace root **and** on every `button, input, select, textarea`. Browsers do not pass the page font down to form controls; this is the main cause of inconsistent button text.

Add once per workspace (root element gets `className="hms-root"`):

```css
.hms-root, .hms-root button, .hms-root input, .hms-root select, .hms-root textarea { font-family: 'Inter', sans-serif; }
.hms-root button:focus-visible, .hms-root [role="button"]:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.hms-row:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
.hms-kbd { font-size: 11px; font-weight: 600; line-height: 1; padding: 3px 5px; border-radius: 4px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; white-space: nowrap; }
```

Type scale (only these sizes):

| Use | Size / Weight |
|---|---|
| Page title (H1) | 32px / 700, letter-spacing -0.01em |
| Detail title (H3) | 18–20px / 600–700 |
| Panel title | 16px / 600 |
| Body, buttons, inputs, sidebar items, row titles | 14px (row titles 600) |
| Secondary text, descriptions, filter chips | 13px |
| Captions, badges, meta lines, uppercase section labels | 12px |
| Keyboard hint chips only | 11px |
| KPI value | 28px / 700 |

Never use 10px or 11px for readable text. Never mix 13px and 14px buttons on one screen.

Colors:

| Token | Value |
|---|---|
| Primary | #2563EB (hover/strong #1D4ED8) |
| Primary tint (active/selected bg) | #EFF6FF, border #BFDBFE |
| Success | #16A34A · bg #F0FDF4 · border #BBF7D0 · text #15803D |
| Warning | #F59E0B · bg #FFFBEB · border #FDE68A · text #B45309 |
| Danger | #DC2626 · bg #FEF2F2 · border #FECACA |
| Page background | #F9FAFB |
| Panel / sub-header background | #F8FAFC |
| Border | #E5E7EB (dividers inside lists #F1F5F9) |
| Text primary / secondary / muted | #111827 / #6B7280 (#64748B) / #94A3B8 |

Surfaces:

- Panel: white, `1px solid #E5E7EB`, radius 12px, shadow `0 1px 2px rgba(0,0,0,0.02)`.
- Inner section card: `1px solid #E5E7EB`, radius 10px, header strip #F8FAFC with 12px uppercase label (letter-spacing 0.04em, color #475569).
- Page padding 24px; gap between page sections 20–24px; gap between cards 16px.

---

## 19.2 Left Sidebar

Width 260px, white, `border-right: 1px solid #E5E7EB`, full height, three fixed parts and a scrolling middle:

1. **Brand** (padding 16px 18px, bottom divider #F1F5F9): 32px blue square "N" (radius 8px) + "North Hospital" (14px/700) + "Clinical Enterprise HMS" (12px #64748B).
2. **Department & role card** (margin 12px 14px 8px, padding 10px 12px, bg #F8FAFC, border #E2E8F0, radius 10px):
   - Row 1: label "CURRENT DEPARTMENT" (10px/700 uppercase #64748B) + role badge (e.g. ADMIN, blue tint) → icon + department name (12px/600) → scope line (11px #64748B, e.g. "OPD · IPD · Central store").
   - Dashed divider, then "OPERATING ROLE" + green "ACTIVE" badge → role name → "ID: {employeeId} · {responsibility}".
3. **Navigation** (scrolls; padding 4px 10px 12px):
   - Items are grouped. Group order = **operational priority** for that role: Overview first, then daily operations, then safety/stock or clinical risk, then governance/reports/settings last.
   - Group header is a `<button aria-expanded>`: 12px/700 uppercase label, item-count pill, chevron (down = open, right = collapsed). Clicking collapses/expands the group. The group containing the active item shows its label and pill in blue.
   - Items are `<button>` elements, height 40px, padding 0 10px, radius 8px, gap 10px, 14px text, 18px icon.
   - Active item: bg #EFF6FF, border 1px #BFDBFE, text #1D4ED8 600, icon #2563EB, shadow `0 1px 3px rgba(37,99,235,0.08)`. Only one active item.
   - Hover: bg #F8FAFC. Keyboard focus: 2px blue outline.
   - Live counts sit on the right as a pill (12px/600, radius 10px): grey #F1F5F9/#64748B normally, blue #DBEAFE/#1E40AF on the active item, red #FEF2F2/#DC2626 with red border when it signals a problem (gaps, out of stock, issues). Counts come from real data only.
   - Each item has `title="{label} (Alt+n)"` matching its keyboard shortcut (19.8).
4. **User card** (bottom, top border): 36px initials avatar (blue tint, 1.5px #BFDBFE border) + name (14px/600) + role (12px) — clicking opens My Profile — and a logout icon button on the right (hover red tint).

---

## 19.3 Top Bar & Profile Control

Sticky, height 52px, white, bottom border, padding 0 24px.

- **Left — breadcrumb** (12px #64748B, "/" separators #D1D5DB): `North Hospital / {Department · Role} / {Current section}` with the current section 600 #111827. Optional status chip after it (e.g. "Read-only" grey, "Live" green with dot).
- **Right**, in this order, gap 10px, all 40px tall, radius 10px:
  1. Operational status chips the role needs (date/time — live, never hard-coded; shift; drawer balance…), 13px, 16px icon.
  2. **Shortcuts** button: `?` kbd chip + "Shortcuts" (opens the shortcut dialog).
  3. 1px × 20px divider.
  4. **Profile control** — must be large and calm:
     - Button height 44px, padding 0 12px 0 6px, border #E2E8F0, radius 10px.
     - 32px initials avatar (blue tint, 1.5px #BFDBFE border, 13px/700).
     - Name 14px/600 (max-width 200px, ellipsis) over a **short** role label 12px #64748B (e.g. "Pharmacy Admin", never a long designation that truncates).
     - 16px chevron that rotates when open. `aria-haspopup="menu"`, `aria-expanded`, shortcut Alt+P.
     - Menu (width 285px, radius 12px, strong shadow): header card (#F8FAFC) with 40px avatar, name 14px/700, email 12px, green role pill; items **My Profile**, **Change Password**; divider; **Sign Out** (red). Items 14px, padding 10px 12px, `role="menuitem"`.
     - Menu keyboard: opens with focus on the first item, ↑/↓/Home/End move, Esc closes and returns focus to the button, outside click closes.
     - Reuse `MyProfileModal` and `ChangePasswordModal` from `frontend/src/pages/pharmacy/inventory/modals/`.
- Do not add Help or Notifications here unless the department already has them.

Use the signed-in user from `useAuth()` for name, initials and role. Never hard-code a person's name.

---

## 19.4 Page Header

White panel (radius 12px, padding 22px 26px), flex row, wraps on narrow screens.

- Left: H1 title "{Department} {Role} Workspace" (32px/700) + one-line description (14px #4B5563, margin-top 6px) describing what the role oversees.
- Right: 1–3 actions, gap 10px. Exactly one primary (blue filled), the rest secondary (white, 1px #D1D5DB). Each shows its shortcut chip (`.hms-kbd`; on the primary button use a translucent white chip).

---

## 19.5 KPI Row — exactly 4 cards

`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px`. Always four, always equal width. If a department has more metrics, keep the 4 most important for that role's daily decisions and move the rest to a relevant section (e.g. Revenue → Reports). Never delete a metric, just move it.

Card: white, 1px #E5E7EB, radius 12px, padding 18px 20px, min-height 120px, column layout with `justify-content: space-between`.

- Top row: label 14px/600 #4B5563 · status badge on the right (12px/600, radius 6px, padding 2px 8px, uppercase short text, semantic color: TODAY grey, % green/amber, OUT OF STOCK red, ON DUTY blue, CLEAR green).
- Value row: value 28px/700 + unit 12px #6B7280 on the baseline.
- Caption: 12px #94A3B8 (amber #B45309 when it describes a problem).
- Exception state (something needs attention): border `1.5px solid #FECACA`, label #B91C1C, faint red shadow. Use sparingly.
- **Clickable**: every card opens its related section. It is `role="button"`, `tabIndex={0}`, opens on click, Enter and Space, and has a `title` naming the destination.
- **No invented values.** While data is loading or unavailable show "—" and a caption such as "Loading…" / "Metrics unavailable". Never use hard-coded fallbacks like `?? 214`.

---

## 19.6 Main Area — Master-Detail (Left box / Right box)

Every list-type section (staff, queues, schedules, orders, inventory, logs, settings, reports, approvals …) uses the same two boxes. Overview/dashboard sections keep their dashboard layout. Consultation keeps its 3-column layout (Section 15). Long forms stay in modals or full pages.

```css
display: grid;
grid-template-columns: minmax(340px, 1fr) minmax(0, 2.3fr);   /* ≈30% / 70%, left never < 340px */
gap: 16px;
align-items: start;
```

### Left box — the list (only the important information)

Panel with `overflow: hidden`, column layout:

1. **Header** (padding 20px 20px 16px, gap 12px):
   - Title 16px/600 + count pill (12px/600, blue tint, radius 9999px; shows "N" or "N of M" when filtered) · optional primary action on the right (40px, e.g. "+ Add Staff" with Alt+N).
   - Description 13px #6B7280.
   - Search input: height 40px, radius 10px, 14px text, 18px blue search icon at left 12px, `/` kbd chip at the right (becomes a clear "×" button when there is text). Focus: blue border + `0 0 0 3px rgba(37,99,235,0.12)`.
   - Filter chips (`role="group"`): height 32px, radius 9999px, 13px/600, each with a count; active = blue filled with translucent count, inactive = white with grey count; `aria-pressed`.
2. **List** (`role="listbox"`, max-height `calc(100vh - 320px)`, scrolls, top border #F3F4F6). Each row (`role="option"`, `aria-selected`):
   - Padding 12px 16px, gap 6px, divider #F1F5F9, left border 3px (transparent / #2563EB when selected), selected bg #EFF6FF and title #1D4ED8.
   - Line 1: title 14px/600 (ellipsis, full text in `title`) + status badge on the right.
   - Line 2: sub-line 12px #64748B (IDs in monospace 12px · role · area).
   - Line 3 (optional): meta left / meta right, 12px #475569 (e.g. shift on the left, "46/60 · TAT 6.2 min" on the right).
   - Line 4 (optional): **completion bar** — 6px tall, radius 3px, track #F1F5F9, fill #2563EB, `role="progressbar"` with aria values. **When complete (≥ 100%) hide the bar** and show a green "✓ {Done label}" (e.g. "Target met", "Fully covered").
   - **No View/Edit buttons in rows.** Selecting a row shows it in the right box; editing happens from the right box (or Enter / double-click on the row).
   - Empty state: centered 14px #6B7280, e.g. "Nothing matches this search or filter."
3. **Footer** (padding 12px 16px, 12px #6B7280, top border): "{shown} of {total} shown" · "↑ ↓ move · Enter {primary action}".

### Right box — the details

Panel, `position: sticky; top: 76px; max-height: calc(100vh - 100px)`, column layout, `overflow: hidden`, `tabIndex={-1}` so Enter can move focus into it.

1. **Header** (padding 16px 24px, bottom border): 40px initials/icon avatar + title 18px/700 + status badge, subtitle 12px #64748B (role · ID · area) · primary edit action on the right (40px secondary button, e.g. "Complete / Edit Profile"). For read-only sections show a small caption bar instead: uppercase section label (12px/700) + "Read-only" chip.
2. **Stat strip** (bg #F8FAFC, padding 16px 24px, bottom border): `repeat(4, minmax(0,1fr))`, gap 12px. Each: 12px uppercase label, 18px/700 value, 12px note.
3. **Body** (scrolls; padding 20px 24px; gap 18px): sections as inner cards (19.1), e.g. performance (completion bar with the same hide-when-complete rule), safety & compliance, recent actions, policy impact, key figures.
4. **Footer actions** (optional, padding 16px 20px, top border): full-width 40px buttons.
5. Empty state when nothing is selectable: "Select an item from the list to see its details."

### Selection rules (critical)

- Build one filtered list per section. The **active item = the selected key if it is in the filtered list, otherwise the first filtered row, otherwise none.** Use this same value for both the highlighted row and the right box. Never fall back to an item the filters hide.
- Select by a **stable key** (ID/code), never by array index.
- Map API field names to the UI shape in the service layer (see 19.9) so every row has a defined key.

---

## 19.7 Buttons

| Type | Style |
|---|---|
| Primary | height 40px, padding 0 16px, radius 10px, 14px/600, bg #2563EB, text white, 1px #2563EB border, 18px icon, gap 8px |
| Secondary | same size, white bg, 1px #D1D5DB border, text #111827 |
| Danger | same size, white bg, text #DC2626, 1px #FECACA border (filled red only for destructive confirms) |
| Ghost / icon | transparent, 32–36px square, radius 6–8px, muted icon, tinted hover |
| Filter chip | 32px, radius 9999px, 13px/600 (19.6) |

- Always `type="button"`. Never rely on the browser default font (19.1).
- Show the keyboard shortcut as an `.hms-kbd` chip inside page-header buttons.
- Every icon-only button has `aria-label` and `title`.

---

## 19.8 Keyboard-First Operation (mandatory)

Most hospital staff work from the keyboard. Every workspace supports:

| Keys | Action |
|---|---|
| Alt+1 … Alt+9, Alt+0 | Open sidebar sections in order (Overview = Alt+1, 10th = Alt+0); focus lands in that section's search box |
| `/` | Focus the current list search |
| ↑ ↓ · PageUp/PageDown · Home/End | Move the selection (in the search box ↑/↓ move without leaving it) |
| Enter | Primary action on the selected row (e.g. edit profile, assign), otherwise move focus into the right box |
| Esc | Clear the search (second Esc leaves it) · close menus and dialogs |
| Alt+N | Main "add/new" action of the section |
| Alt+{letter} | Page-header actions (e.g. Alt+L Audit logs, Alt+R Daily report) |
| Alt+P | Account menu |
| `?` | Keyboard shortcuts dialog |

Implementation rules:

- One global `keydown` listener per workspace. Match `e.code` (`Digit1`, `KeyN`), not `e.key`, so it works on every keyboard layout.
- Do not use Alt+D, Alt+E, Alt+F (browser menus) or Ctrl combinations.
- Ignore single-key shortcuts (`/`, `?`) while the user is typing in an input/textarea/select.
- Disable global shortcuts while any modal is open; modals handle their own keys.
- Lists: `aria-activedescendant` on the search box, roving `tabIndex` on rows (selected row = 0, others = -1), focus/scroll the newly selected row into view.
- Every modal: `role="dialog"`, `aria-modal="true"`, an `aria-label`, focus moves into it on open (`autoFocus`), Esc closes it (not while saving), close button has `aria-label`.
- Multi-select pickers inside dialogs are `<button role="checkbox" aria-checked>`, never clickable divs.
- Visible focus outline on every interactive element (19.1). Use `aria-keyshortcuts` on controls that have a shortcut.
- Provide the "?" Keyboard shortcuts dialog listing the table above for that department.

---

## 19.9 Data & Engineering Rules

- **No invented values** anywhere on screen: KPI cards, counts, dates, names, stock figures. Show "—", "Loading…" or an empty state instead. Sample/fallback data in code must not appear as if it were live.
- **Map API responses in the service file** (`frontend/src/services/*Service.ts`) to the shape the UI reads. Backend serializers often return model fields (`setting_key`, `user_name`, `entity_reference`, `effective_value`…); the screen must never read `undefined`.
- Before wiring a section, check that its endpoint exists in the backend `urls.py`; if it does not, say so instead of silently showing fallback data.
- Declare helper functions (badge renderers, formatters) **before** any `useMemo`/render code that calls them. A `const` arrow function used before its declaration crashes the screen at runtime even though TypeScript compiles.
- Keep each department's permissions, read-only rules, routes and API contracts unchanged. Visual consistency never justifies backend or data-model changes.
- Do not create duplicate components or new colors. If a shared component would make the screen look different from Section 19, follow Section 19.
- Verify with `npx tsc -p tsconfig.app.json --noEmit`, `npx oxlint <files>` (no new warnings) and `npx vite build`, then click through every section in the browser.

---

# 20. Apply Checklist (use for every department)

Work through these in order. Report what changed and anything you could not apply.

1. **Inspect** the department's workspace file(s), its sidebar menu, its service file and the backend endpoints it calls. List any API fields the UI reads that the API does not return.
2. **Root & tokens**: add the 19.1 CSS block, `className="hms-root"`, Inter font, 14px base.
3. **Sidebar** (19.2): brand, department & role card, grouped collapsible navigation in priority order, 40px items with 14px text / 18px icons, live count pills, user card with logout. Keep every existing menu item and permission.
4. **Top bar** (19.3): breadcrumb, live status chips, Shortcuts button, large profile control with menu (My Profile, Change Password, Sign Out) using the real signed-in user.
5. **Page header** (19.4): 32px title, description, 1–3 actions with shortcut chips.
6. **KPIs** (19.5): choose exactly 4, equal width, clickable to their sections, real data only; move extra metrics into a relevant section.
7. **Main area** (19.6): convert every list section to Left box (~30%, min 340px) + Right box (~70%). Remove per-row View/Edit buttons, add completion bars that hide when complete, apply the selection rules.
8. **Buttons & typography** (19.1, 19.7): one font, the type scale only, 40px buttons, 10px radius.
9. **Keyboard** (19.8): Alt+number navigation, `/`, arrows, Enter, Esc, Alt+N, Alt+P, `?` dialog, modal Esc/focus, visible focus.
10. **Data** (19.9): map API fields in the service, remove hard-coded fallbacks, flag missing endpoints.
11. **Verify**: type-check, lint, build, and click through every section (selection sync, filters, search, shortcuts, modals, profile menu).

---

# 21. One-Line Prompt for Other Departments

Copy and paste, replacing the department and route:

> Apply the HMS design bible (`.agent/workflows/docs/hms-design-bible.md`, Sections 19–20) to the **{Department} {Role} workspace** at **`{route}`**. Use `frontend/src/pages/pharmacy/admin/PharmacyAdminWorkspace.tsx` as the reference implementation. Keep all existing menu items, data, permissions and workflows. Follow the Section 20 checklist step by step and report what changed and anything you could not apply.
