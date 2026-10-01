# NorthHospital HMS Design Bible

Version: 1.0

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

5. Maximum 5 KPI cards in a row.

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
