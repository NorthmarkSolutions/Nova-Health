repo: NorthmarkSolutions/Nova-Health
branch: main
path: frontend/src

## Last sync
date: 2026-09-30T07:13:12Z

### Updated in this project
- Lab Technician workspace (Test Queue) redesigned to the bible + reference style
- Pathologist workspace (Review Queue, Signed Reports, Test Catalog)
- Lab Department Admin overview (staff, equipment, pricing, analytics)

## Screen map
| Screen | Repo files |
|---|---|
| Lab Technician.dc.html | frontend/src/pages/lab/LabDashboard.tsx, backend/apps/lab/models.py, frontend/src/index.css |
| Lab Technician Equipment.dc.html | frontend/src/pages/lab/LabDashboard.tsx, frontend/src/index.css |
| Pathologist Signed Reports.dc.html | frontend/src/pages/lab/LabDashboard.tsx, backend/apps/lab/models.py |
| Pathologist Test Catalog.dc.html | backend/apps/lab/models.py (LabTest), frontend/src/index.css |
| Lab Admin Staff / Scheduling / Equipment / Pricing / Settings / Reports .dc.html | frontend/src/pages/department/DepartmentWorkspaceLayout.tsx |
| Lab Admin.dc.html | frontend/src/pages/department/DepartmentWorkspaceLayout.tsx, backend/apps/lab/models.py |
| Pathologist.dc.html | frontend/src/pages/lab/LabDashboard.tsx, backend/apps/lab/models.py, frontend/src/index.css |
