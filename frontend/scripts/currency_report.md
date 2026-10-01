# Currency & Money Formatting Investigation Report

Total genuine money/currency locations found: **282** across **50 files**.

## Other (21 locations)

### `src/components/layout/AppLayout.tsx` (9 locations)
- **Line 72** [`Dollar symbol JSX/String`]: `? \`${user.firstName || ''} ${user.lastName || ''}\`.replace(/^Nurse\s+/i, '').replace(/^Dr\.\s+/i, '').trim() || user.username`
- **Line 279** [`Dollar symbol JSX/String`]: `badge: doctorStats.queueCount > 0 ? \`${doctorStats.queueCount}\` : undefined,`
- **Line 304** [`Dollar symbol JSX/String`]: `badge: doctorStats.inpatientCount > 0 ? \`${doctorStats.inpatientCount}\` : undefined,`
- **Line 334** [`Dollar symbol JSX/String`]: `badge: assistantStats.waitingCount > 0 ? \`${assistantStats.waitingCount}\` : undefined,`
- **Line 341** [`Dollar symbol JSX/String`]: `badge: assistantStats.labCount > 0 ? \`${assistantStats.labCount}\` : undefined,`
- **Line 348** [`Dollar symbol JSX/String`]: `badge: assistantStats.completedCount > 0 ? \`${assistantStats.completedCount}\` : undefined,`
- **Line 414** [`Dollar symbol JSX/String`]: `? \`${nurseStats.waitingTriage}\``
- **Line 416** [`Dollar symbol JSX/String`]: `? \`${nurseStats.activeBeds}\``
- **Line 491** [`Dollar symbol JSX/String`]: `return \`${user?.departmentName || 'Department'} Workspace\`;`

### `src/components/workspace/RowActionsMenu.tsx` (4 locations)
- **Line 199** [`Dollar symbol JSX/String`]: `? \`${action.width}px\``
- **Line 297** [`Dollar symbol JSX/String`]: `top: menuCoords.top !== undefined ? \`${menuCoords.top}px\` : undefined,`
- **Line 298** [`Dollar symbol JSX/String`]: `bottom: menuCoords.bottom !== undefined ? \`${menuCoords.bottom}px\` : undefined,`
- **Line 299** [`Dollar symbol JSX/String`]: `right: \`${menuCoords.right}px\`,`

### `src/pages/auth/LoginPage.tsx` (1 locations)
- **Line 273** [`Dollar symbol JSX/String`]: `(credentialId.includes('@') ? credentialId : \`${credentialId.toLowerCase()}@northhospital.com\`);`

### `src/pages/nurse/components/ObservationBedsView.tsx` (1 locations)
- **Line 31** [`Dollar symbol JSX/String`]: `const timeStr = \`${String(now.getHours()).padStart(2, '0')}:${String(`

### `src/pages/nurse/components/VitalsAssessmentView.tsx` (5 locations)
- **Line 39** [`Dollar symbol JSX/String`]: `\`${user.firstName || ''} ${user.lastName || ''}\`.replace(/^Nurse\s+/i, '').replace(/^Dr\.\s+/i, '').trim() ||`
- **Line 370** [`Dollar symbol JSX/String`]: `bp: systolic.trim() && diastolic.trim() ? \`${systolic.trim()}/${diastolic.trim()}\` : undefined,`
- **Line 418** [`Dollar symbol JSX/String`]: `const timeStr = \`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}\`;`
- **Line 432** [`Dollar symbol JSX/String`]: `const timeStr = \`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}\`;`
- **Line 1060** [`Dollar symbol JSX/String`]: `Score: {painScale !== null ? \`${painScale} / 10\` : 'Not assessed'}`

### `src/pages/nurse/NurseDashboard.tsx` (1 locations)
- **Line 30** [`Dollar symbol JSX/String`]: `? \`${user.firstName} ${user.lastName}\``

## Admin & Organization Module (114 locations)

### `src/pages/admin/AdminDashboard.tsx` (3 locations)
- **Line 118** [`Hardcoded dollar amount ($123)`]: `<div className="stat-value">$14,850</div>`
- **Line 212** [`Hardcoded dollar amount ($123)`]: `<div style={{ color: 'var(--text-muted)' }}>Dr. Sarah Jenkins consultation fee adjusted to $75.00</div>`
- **Line 217** [`Hardcoded dollar amount ($123)`]: `<div style={{ color: 'var(--text-muted)' }}>INV-202609-00041 refunded $50.00</div>`

### `src/pages/admin/setup/ClinicalSetup.tsx` (6 locations)
- **Line 38** [`Hardcoded dollar amount ($123)`]: `{ id: '1', code: 'PROC-93000', name: '12-Lead Electrocardiogram (ECG)', dept: 'Cardiology', duration: '15 mins', fee: '$45.00', status: 'ACTIVE' },`
- **Line 39** [`Hardcoded dollar amount ($123)`]: `{ id: '2', code: 'PROC-93306', name: '2D Echocardiography with Doppler', dept: 'Cardiology', duration: '30 mins', fee: '$220.00', status: 'ACTIVE' },`
- **Line 40** [`Hardcoded dollar amount ($123)`]: `{ id: '3', code: 'PROC-12001', name: 'Minor Wound Debridement & Suturing', dept: 'Emergency', duration: '25 mins', fee: '$95.00', status: 'ACTIVE' },`
- **Line 41** [`Hardcoded dollar amount ($123)`]: `{ id: '4', code: 'PROC-47562', name: 'Laparoscopic Cholecystectomy', dept: 'Surgery', duration: '90 mins', fee: '$2,400.00', status: 'ACTIVE' },`
- **Line 42** [`Hardcoded dollar amount ($123)`]: `{ id: '5', code: 'PROC-27447', name: 'Total Knee Arthroplasty (Replacement)', dept: 'Orthopedics', duration: '120 mins', fee: '$4,800.00', status: 'ACTIVE' },`
- **Line 447** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $150.00" onChange={(e) => setFormData({ ...formData, fee: e.target.value })} required />`

### `src/pages/admin/setup/FinancialSetup.tsx` (19 locations)
- **Line 28** [`Hardcoded dollar amount ($123)`]: `{ id: '1', code: 'BH-CONS', name: 'Doctor OPD Consultation', dept: 'Clinical OPD', tax: '0% (Exempt)', defaultCharge: '$75.00', status: 'ACTIVE' },`
- **Line 29** [`Hardcoded dollar amount ($123)`]: `{ id: '2', code: 'BH-BED-ICU', name: 'ICU Critical Care Bed Tariff', dept: 'Inpatient IPD', tax: '0% (Exempt)', defaultCharge: '$1,200.00/day', status: 'ACTIVE' },`
- **Line 30** [`Hardcoded dollar amount ($123)`]: `{ id: '3', code: 'BH-NURS', name: 'Daily Inpatient Nursing Care', dept: 'Nursing Desk', tax: '0% (Exempt)', defaultCharge: '$120.00/day', status: 'ACTIVE' },`
- **Line 33** [`Hardcoded dollar amount ($123)`]: `{ id: '6', code: 'BH-OT', name: 'Operation Theatre & Anesthesia Charges', dept: 'Surgery & OT', tax: '0% (Exempt)', defaultCharge: '$650.00/hr', status: 'ACTIVE' },`
- **Line 41** [`Hardcoded dollar amount ($123)`]: `{ id: '4', name: 'Luxury Inpatient Room Surcharge', rate: '18.0%', cgst: '9.0%', sgst: '9.0%', appliesTo: 'Deluxe Suites & VIP Amenities (> $500/day)', status: 'ACTIVE' },`
- **Line 51** [`Hardcoded dollar amount ($123)`]: `originalPrice: '$420.00',`
- **Line 52** [`Hardcoded dollar amount ($123)`]: `pkgPrice: '$249.00',`
- **Line 61** [`Hardcoded dollar amount ($123)`]: `originalPrice: '$550.00',`
- **Line 62** [`Hardcoded dollar amount ($123)`]: `pkgPrice: '$349.00',`
- **Line 71** [`Hardcoded dollar amount ($123)`]: `originalPrice: '$3,200.00',`
- **Line 72** [`Hardcoded dollar amount ($123)`]: `pkgPrice: '$2,200.00',`
- **Line 80** [`Hardcoded dollar amount ($123)`]: `{ id: '1', code: 'INS-STAR', name: 'Star Health & Allied Insurance', tpa: 'Direct Empanelment', preAuthLimit: '$15,000', cashless: 'YES', contact: '1800-425-2255' },`
- **Line 81** [`Hardcoded dollar amount ($123)`]: `{ id: '2', code: 'INS-HDFC', name: 'HDFC ERGO General Health', tpa: 'Medi Assist TPA', preAuthLimit: '$20,000', cashless: 'YES', contact: '1800-2666' },`
- **Line 82** [`Hardcoded dollar amount ($123)`]: `{ id: '3', code: 'INS-ICICI', name: 'ICICI Lombard Health Care', tpa: 'Paramount TPA', preAuthLimit: '$18,000', cashless: 'YES', contact: '1800-266-7780' },`
- **Line 83** [`Hardcoded dollar amount ($123)`]: `{ id: '4', code: 'INS-CGHS', name: 'Central Govt Health Scheme (CGHS)', tpa: 'Govt Portal Desk', preAuthLimit: '$50,000', cashless: 'YES', contact: '011-2306-1234' },`
- **Line 462** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $40.00" onChange={(e) => setFormData({ ...formData, defaultCharge: e.target.value })} required />`
- **Line 508** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $300.00" onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} required />`
- **Line 512** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $199.00" onChange={(e) => setFormData({ ...formData, pkgPrice: e.target.value })} required />`
- **Line 533** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $10,000" onChange={(e) => setFormData({ ...formData, preAuthLimit: e.target.value })} />`

### `src/pages/admin/setup/organization/BedsSection.tsx` (11 locations)
- **Line 41** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$1,200',`
- **Line 52** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$1,200',`
- **Line 63** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$1,200',`
- **Line 74** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$250',`
- **Line 85** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$250',`
- **Line 96** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$250',`
- **Line 107** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$650',`
- **Line 118** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$800',`
- **Line 129** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$500',`
- **Line 200** [`Hardcoded dollar amount ($123)`]: `dailyTariff: '$300',`
- **Line 568** [`Hardcoded dollar amount ($123)`]: `<input className="form-input" placeholder="e.g. $1,200" onChange={(e) => setFormData({ ...formData, dailyTariff: e.target.value })} required />`

### `src/pages/admin/setup/organization/BranchesSection.tsx` (4 locations)
- **Line 38** [`Hardcoded dollar amount ($123)`]: `performance: { occupancy: '84%', revenueToday: '$24,500', patientVolume: '240 Visits', utilization: '92%' },`
- **Line 51** [`Hardcoded dollar amount ($123)`]: `performance: { occupancy: '62%', revenueToday: '$8,400', patientVolume: '85 Visits', utilization: '78%' },`
- **Line 64** [`Hardcoded dollar amount ($123)`]: `performance: { occupancy: '90%', revenueToday: '$4,200', patientVolume: '45 Visits', utilization: '88%' },`
- **Line 73** [`Hardcoded dollar amount ($123)`]: `performance: { occupancy: '0%', revenueToday: '$0', patientVolume: '0', utilization: '0%' },`

### `src/pages/admin/setup/organization/BulkStaffImportModal.tsx` (7 locations)
- **Line 163** [`Dollar symbol JSX/String`]: `reasons.push(\`Employee Code "${empCode}" already exists in Staff Master.\`);`
- **Line 165** [`Dollar symbol JSX/String`]: `reasons.push(\`Duplicate Employee Code "${empCode}" within this file.\`);`
- **Line 195** [`Dollar symbol JSX/String`]: `reasons.push(\`Invalid role "${rawObj.role}". Must be Doctor, Nurse, Technician, Paramedic, Admin, or Support.\`);`
- **Line 240** [`Dollar symbol JSX/String`]: `reasons.push(\`Department(s) not found in hospital master: "${invalidDepts.join(', ')}".\`);`
- **Line 272** [`Dollar symbol JSX/String`]: `matchedShiftHours.push(\`${found.startTime} - ${found.endTime}\`);`
- **Line 280** [`Dollar symbol JSX/String`]: `reasons.push(\`Shift(s) not recognized: "${invalidShifts.join(', ')}".\`);`
- **Line 296** [`Dollar symbol JSX/String`]: `reasons.push(\`Invalid status "${rawObj.status}". Allowed: Active, On Leave, Suspended, Resigned.\`);`

### `src/pages/admin/setup/organization/CampusInfrastructureSection.tsx` (19 locations)
- **Line 209** [`Dollar symbol JSX/String`]: `return \`${cleanBuilding}-${cleanFloor}-${prefix}${wardIndex}\`;`
- **Line 221** [`Dollar symbol JSX/String`]: `return \`${cleanWard}-${prefix}${roomIndex}\`;`
- **Line 233** [`Dollar symbol JSX/String`]: `return \`${cleanRoom}-${prefix}${bedPadded}\`;`
- **Line 252** [`Dollar symbol JSX/String`]: `return \`${cleanBuilding}-${cleanWard}-${cleanFloor}-${cleanWardIndex}-${bedPrefix}${bedPadded}\`;`
- **Line 420** [`Dollar symbol JSX/String`]: `daysStay = diffHours <= 1 ? 'Just Admitted' : \`${diffHours} hrs (Day 1)\`;`
- **Line 423** [`Dollar symbol JSX/String`]: `daysStay = \`${daysCount} ${daysCount === 1 ? 'Day' : 'Days'} Stay\`;`
- **Line 462** [`Dollar symbol JSX/String`]: `admittingDoctor: \`${docName} (${docSpec})\`,`
- **Line 579** [`Dollar symbol JSX/String`]: `timestamp: \`${formattedTime} - Present\`,`
- **Line 583** [`Dollar symbol JSX/String`]: `actorOrPatient: \`${pt.patientName} (${pt.uhid}, ${pt.age}y / ${pt.gender})\`,`
- **Line 2761** [`Dollar symbol JSX/String`]: `{roster.compounders.map((c) => \`${c.name} (${c.duty})\`).join('; ') || 'Assigned per shift'}`
- **Line 2768** [`Dollar symbol JSX/String`]: `{roster.cleaners.map((cl) => \`${cl.name} (${cl.lastRound})\`).join('; ') || 'Housekeeping Desk'}`
- **Line 2809** [`Dollar symbol JSX/String`]: `const bedLocator = \`${bldCode}-${wardCode}-${floorCode}-${roomCode}-${bedCode}\`;`
- **Line 2958** [`Dollar symbol JSX/String`]: `title={\`${d.name} (${d.specialty}) • Role: ${d.role}\`}`
- **Line 3022** [`Dollar symbol JSX/String`]: `{bed.bedType} • <strong style={{ color: '#047857' }}>${bed.dailyTariff}/day</strong>`
- **Line 4337** [`Dollar symbol JSX/String`]: `utilities: \`${buildingData.powerBackupKva} kVA DG Backup, ${buildingData.hasCentralOxygen ? 'Central O2 Pipeline (MGPS)' : 'Oxygen Cylinder Supply'}\`,`
- **Line 5608** [`Dollar symbol JSX/String`]: `{pt ? \`${pt.patientName} (${pt.uhid}) • ${pt.ipdAdmissionNo} • Room: ${bedState.roomNumber || 'Room 1'}\` : \`Room: ${bedState.roomNumber || 'Room 1'} • Vacant Bed Infrastructure Profile\`}`
- **Line 6259** [`Label with dollar sign`]: `Standard Tariff: ${dailyTariff}/day • Immediate Multi-Disciplinary Staff Assignment`
- **Line 6468** [`Dollar symbol JSX/String`]: `value={roster.compounders.map((c) => \`${c.name} (${c.duty})\`).join('; ')}`
- **Line 6485** [`Dollar symbol JSX/String`]: `value={roster.cleaners.map((c) => \`${c.name}\`).join(', ')}`

### `src/pages/admin/setup/organization/DepartmentProfileView.tsx` (11 locations)
- **Line 549** [`Dollar symbol JSX/String`]: `{ id: '1', title: \`${department.name} Clinical Standard Operating Procedure\`, type: 'SOP', version: 'v2.4', updatedAt: '2026-08-15', status: 'Approved' },`
- **Line 601** [`Dollar symbol JSX/String`]: `deptAdminStaffName: department.deptAdminStaffName || \`${department.shortName || 'Dept'} Administrator\`,`
- **Line 729** [`Dollar symbol JSX/String`]: `showToast(\`✓ Applied "${preset}" archetype permissions preset to ${profile.name}\`);`
- **Line 788** [`Dollar symbol JSX/String`]: `showToast(\`✓ Department permissions & access controls for "${profile.name}" successfully saved!\`);`
- **Line 815** [`Dollar symbol JSX/String`]: `showToast(\`✓ Department profile for "${profile.name}" saved successfully!\`);`
- **Line 880** [`Dollar symbol JSX/String`]: `description: \`${profile.description} [Consolidated into ${targetDept?.name || 'target department'} on ${new Date().toLocaleDateString()}]\`,`
- **Line 1747** [`Hardcoded dollar amount ($123)`]: `<strong style={{ fontSize: '1rem', color: '#10b981' }}>$50.00 / ₹800</strong>`
- **Line 1755** [`Dollar symbol JSX/String`]: `<strong style={{ fontSize: '1rem' }}>${(profile.budget || 0).toLocaleString()}</strong>`
- **Line 2187** [`Currency code USD`]: `<label className="form-label">Annual Operating Budget ($ USD)</label>`
- **Line 3007** [`Dollar symbol JSX/String`]: `title: \`${profile.shortName || 'Dept'} New Operational Policy\`,`
- **Line 4164** [`Dollar symbol JSX/String`]: `link.download = \`${profile.code}_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json\`;`

### `src/pages/admin/setup/organization/DocumentPreviewModal.tsx` (3 locations)
- **Line 347** [`Hardcoded dollar amount ($123)`]: `<strong>$230.00</strong>`
- **Line 351** [`Hardcoded dollar amount ($123)`]: `<span>$11.50</span>`
- **Line 364** [`Hardcoded dollar amount ($123)`]: `<strong>$241.50</strong>`

### `src/pages/admin/setup/organization/hospitalStaffStore.ts` (2 locations)
- **Line 531** [`Dollar symbol JSX/String`]: `return \`${hours}h ${mins > 0 ? \`${mins}m\` : '00m'}\`;`
- **Line 888** [`Dollar symbol JSX/String`]: `return \`${prefix}-${deptTag}-${maxSeq + 1}\`;`

### `src/pages/admin/setup/organization/OnboardingProgressSection.tsx` (1 locations)
- **Line 105** [`Dollar symbol JSX/String`]: `width: \`${overallProgress}%\`,`

### `src/pages/admin/setup/organization/OnboardingStarterPacksModal.tsx` (1 locations)
- **Line 984** [`Dollar symbol JSX/String`]: `backgroundColor: \`${pack.accentColor}15\`,`

### `src/pages/admin/setup/organization/ProfileSection.tsx` (2 locations)
- **Line 136** [`Currency code USD`]: `currency: 'USD ($)',`
- **Line 728** [`Dollar symbol JSX/String`]: `if (window.confirm(\`Delete shift "${shift.name}" (${shift.code})?\`)) {`

### `src/pages/admin/setup/organization/RegisterDepartmentWizardModal.tsx` (4 locations)
- **Line 71** [`Dollar symbol JSX/String`]: `? \`${hospitalShifts[0].name} (${hospitalShifts[0].startTime} - ${hospitalShifts[0].endTime})\``
- **Line 274** [`Dollar symbol JSX/String`]: `adminEmail: \`${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com\`,`
- **Line 567** [`Dollar symbol JSX/String`]: `<option key={sh.id} value={\`${sh.name} (${sh.startTime} - ${sh.endTime})\`}>`
- **Line 683** [`Dollar symbol JSX/String`]: `{code ? \`${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com\` : 'dept.admin@northhospital.com'}`

### `src/pages/admin/setup/organization/RoomsSection.tsx` (1 locations)
- **Line 229** [`Dollar symbol JSX/String`]: `<td><strong>{room.bedCapacity > 0 ? \`${room.bedCapacity} Bed(s)\` : 'No Bed'}</strong></td>`

### `src/pages/admin/setup/organization/StaffMasterSection.tsx` (10 locations)
- **Line 392** [`Dollar symbol JSX/String`]: `return \`${prefix}-${randNum}\`;`
- **Line 422** [`Dollar symbol JSX/String`]: `shiftHoursList: [\`${defaultShift.startTime} - ${defaultShift.endTime}\`],`
- **Line 425** [`Dollar symbol JSX/String`]: `shiftHours: \`${defaultShift.startTime} - ${defaultShift.endTime}\`,`
- **Line 560** [`Dollar symbol JSX/String`]: `return sh ? \`${sh.startTime} - ${sh.endTime}\` : '08:00 - 16:00';`
- **Line 564** [`Dollar symbol JSX/String`]: `const shiftHours = primaryShift ? \`${primaryShift.startTime} - ${primaryShift.endTime}\` : '08:00 - 16:00';`
- **Line 681** [`Dollar symbol JSX/String`]: `return sh ? \`${sh.startTime} - ${sh.endTime}\` : '';`
- **Line 1315** [`Dollar symbol JSX/String`]: `width: \`${(member.profileCompletion || 0) >= 90 ? 100 : Math.max(35, member.profileCompletion || 35)}%\`,`
- **Line 1518** [`Dollar symbol JSX/String`]: `{liveCompletion.score >= 90 ? '100% Complete Profile' : \`${Math.max(35, liveCompletion.score)}% Basic Profile Created\`}`
- **Line 1536** [`Dollar symbol JSX/String`]: `{liveCompletion.score >= 90 ? '100%' : \`${Math.max(35, liveCompletion.score)}%\`}`
- **Line 1546** [`Dollar symbol JSX/String`]: `width: \`${liveCompletion.score >= 90 ? 100 : Math.max(35, liveCompletion.score)}%\`,`

### `src/pages/admin/setup/organization/StaffProfileDrawer.tsx` (1 locations)
- **Line 856** [`Dollar symbol JSX/String`]: `shiftHours: sh ? \`${sh.startTime} - ${sh.endTime}\` : '',`

### `src/pages/admin/setup/organization/staffTemplateGenerator.ts` (4 locations)
- **Line 30** [`Dollar symbol JSX/String`]: `return \`"${str.replace(/"/g, '""')}"\`;`
- **Line 32** [`Dollar symbol JSX/String`]: `return \`"${str}"\`;`
- **Line 72** [`Dollar symbol JSX/String`]: `const combinedDepts = \`${primaryDept}; ${secondaryDept}\`;`
- **Line 76** [`Dollar symbol JSX/String`]: `const combinedShifts = \`${primaryShift}; ${secondaryShift}\`;`

### `src/pages/admin/setup/organization/WardsSection.tsx` (1 locations)
- **Line 255** [`Dollar symbol JSX/String`]: `width: \`${occupancyPct}%\`,`

### `src/pages/admin/setup/StaffSetup.tsx` (4 locations)
- **Line 36** [`Hardcoded dollar amount ($123)`]: `fee: '$75.00',`
- **Line 48** [`Hardcoded dollar amount ($123)`]: `fee: '$120.00',`
- **Line 60** [`Hardcoded dollar amount ($123)`]: `fee: '$100.00',`
- **Line 595** [`Hardcoded dollar amount ($123)`]: `placeholder="$85.00"`

## Billing & Accounts Module (32 locations)

### `src/pages/billing/BillingDashboard.tsx` (32 locations)
- **Line 77** [`toFixed(2) money format`]: `const newPaid = Number((activeInvoice.paid + paidIncrement).toFixed(2));`
- **Line 78** [`toFixed(2) money format`]: `const newBal = Math.max(0, Number((activeInvoice.total - newPaid).toFixed(2)));`
- **Line 168** [`Dollar symbol JSX/String`]: `<div className="stat-value">${totalBilled.toFixed(2)}</div>`
- **Line 178** [`Dollar symbol JSX/String`]: `<div className="stat-value">${totalCollected.toFixed(2)}</div>`
- **Line 188** [`Dollar symbol JSX/String`]: `<div className="stat-value">${totalOutstanding.toFixed(2)}</div>`
- **Line 198** [`Hardcoded dollar amount ($123)`]: `<div className="stat-value">$800.00</div>`
- **Line 306** [`Dollar symbol JSX/String`]: `<td>${inv.subtotal.toFixed(2)}</td>`
- **Line 310** [`toFixed(2) money format`]: `-${inv.advanceDeducted.toFixed(2)}`
- **Line 314** [`Dollar symbol JSX/String`]: `<td><strong>${inv.total.toFixed(2)}</strong></td>`
- **Line 318** [`toFixed(2) money format`]: `${inv.balance.toFixed(2)}`
- **Line 390** [`Hardcoded dollar amount ($123)`]: `<td><strong>$500.00</strong></td>`
- **Line 398** [`Hardcoded dollar amount ($123)`]: `<td><strong>$1,000.00</strong></td>`
- **Line 406** [`Hardcoded dollar amount ($123)`]: `<td><strong>$300.00</strong></td>`
- **Line 449** [`Hardcoded dollar amount ($123)`]: `<td>$1,500.00</td>`
- **Line 450** [`Hardcoded dollar amount ($123)`]: `<td>10% ($150.00)</td>`
- **Line 458** [`Hardcoded dollar amount ($123)`]: `<td>$3,200.00</td>`
- **Line 486** [`Hardcoded dollar amount ($123)`]: `<div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$480.00</div>`
- **Line 491** [`Hardcoded dollar amount ($123)`]: `<div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$1,000.00</div>`
- **Line 496** [`Hardcoded dollar amount ($123)`]: `<div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$655.00</div>`
- **Line 501** [`Hardcoded dollar amount ($123)`]: `<div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>$2,135.00</div>`
- **Line 545** [`toFixed(2) money format`]: `${activeInvoice.balance.toFixed(2)}`
- **Line 550** [`toFixed(2) money format`]: `Advance Deducted: ${activeInvoice.advanceDeducted.toFixed(2)}`
- **Line 594** [`toFixed(2) money format`]: `⚠️ Partial Payment: ${(activeInvoice.balance - collectAmount).toFixed(2)} will remain due. Status will become <strong>Partial Paid</strong>.`
- **Line 660** [`Dollar symbol JSX/String`]: `<td>${item.unitPrice.toFixed(2)}</td>`
- **Line 661** [`Dollar symbol JSX/String`]: `<td><strong>${item.total.toFixed(2)}</strong></td>`
- **Line 673** [`Dollar symbol JSX/String`]: `<span>${activeInvoice.subtotal.toFixed(2)}</span>`
- **Line 678** [`toFixed(2) money format`]: `<span>-${activeInvoice.discount.toFixed(2)}</span>`
- **Line 684** [`toFixed(2) money format`]: `<span>-${activeInvoice.advanceDeducted.toFixed(2)}</span>`
- **Line 689** [`Dollar symbol JSX/String`]: `<span style={{ color: 'var(--secondary)' }}>${activeInvoice.total.toFixed(2)}</span>`
- **Line 693** [`Dollar symbol JSX/String`]: `<span>${activeInvoice.paid.toFixed(2)}</span>`
- **Line 697** [`Dollar symbol JSX/String`]: `<span>${activeInvoice.balance.toFixed(2)}</span>`
- **Line 704** [`toFixed(2) money format`]: `⚠️ PARTIAL PAYMENT (${activeInvoice.balance.toFixed(2)} REMAINING)`

## Department Workspaces & Master Settings (44 locations)

### `src/pages/department/DepartmentDoctorManagement.tsx` (4 locations)
- **Line 181** [`Dollar symbol JSX/String`]: `assignedRoomName: assignedRoom ? \`${assignedRoom.name} (${assignedRoom.roomNumber})\` : undefined,`
- **Line 220** [`Dollar symbol JSX/String`]: `assignedRoomName: room101 ? \`${room101.name} (${room101.roomNumber})\` : 'Room 101',`
- **Line 231** [`Dollar symbol JSX/String`]: `assignedRoomName: room102 ? \`${room102.name} (${room102.roomNumber})\` : 'Room 102',`
- **Line 557** [`Money amount with .00 cents`]: `${doc.consultationFee}.00`

### `src/pages/department/DepartmentOpdOperations.tsx` (3 locations)
- **Line 166** [`Dollar symbol JSX/String`]: `roomName: assignedRoom ? \`${assignedRoom.name} (${assignedRoom.roomNumber})\` : undefined,`
- **Line 346** [`Dollar symbol JSX/String`]: `width: \`${stats.capacityPercent}%\`,`
- **Line 833** [`Money amount with .00 cents`]: `${doc.consultationFee || 75}.00 • Billed at Cashier`

### `src/pages/department/DepartmentReports.tsx` (2 locations)
- **Line 119** [`Hardcoded dollar amount ($123)`]: `$6,450`
- **Line 149** [`Dollar symbol JSX/String`]: `width: \`${pct}%\`,`

### `src/pages/department/DepartmentRoomsManagement.tsx` (1 locations)
- **Line 1136** [`Dollar symbol JSX/String`]: `value={\`${wardBuilding} • ${wardFloor}\`}`

### `src/pages/department/DepartmentScheduling.tsx` (3 locations)
- **Line 127** [`Dollar symbol JSX/String`]: `updatedHours = [...currentHours, \`${shift.startTime} - ${shift.endTime}\`];`
- **Line 161** [`Dollar symbol JSX/String`]: `shiftHoursList: matchedShifts.map((s) => \`${s.startTime} - ${s.endTime}\`),`
- **Line 164** [`Dollar symbol JSX/String`]: `shiftHours: \`${matchedShifts[0].startTime} - ${matchedShifts[0].endTime}\`,`

### `src/pages/department/DepartmentSettings.tsx` (18 locations)
- **Line 464** [`Label with dollar sign`]: `Avg Standard Fee: ${avgDoctorFee}.00`
- **Line 479** [`Money amount with .00 cents`]: `From ${tariffMaster.wardTariffs[0]?.dailyRate || 120}.00 / 24h`
- **Line 506** [`Money amount with .00 cents`]: `${tariffMaster.intakeRegistrationFee + tariffMaster.triageVitalsFee}.00`
- **Line 648** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 800, color: '#0284c7' }}>$</span>`
- **Line 665** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>$</span>`
- **Line 682** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: '#dc2626' }}>$</span>`
- **Line 714** [`Dollar template ($${...})`]: `title={\`Apply $${preset} fee\`}`
- **Line 779** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 800, color: '#15803d' }}>$</span>`
- **Line 797** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>`
- **Line 815** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>`
- **Line 908** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>`
- **Line 926** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 700, color: '#ea580c' }}>$</span>`
- **Line 975** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#7e22ce' }}>$</span>`
- **Line 999** [`Dollar symbol JSX/String`]: `<span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0284c7' }}>$</span>`
- **Line 1083** [`Money amount with .00 cents`]: `${simulatedDoctor.standardFee}.00`
- **Line 1095** [`Money amount with .00 cents`]: `${simulatedDoctor.followUpFee || Math.round(simulatedDoctor.standardFee * 0.6)}.00`
- **Line 1107** [`Money amount with .00 cents`]: `${tariffMaster.roomTariffs[0]?.facilityFee || 15}.00`
- **Line 1119** [`Money amount with .00 cents`]: `${tariffMaster.intakeRegistrationFee + tariffMaster.triageVitalsFee}.00`

### `src/pages/department/DepartmentStaffManagement.tsx` (10 locations)
- **Line 369** [`Dollar symbol JSX/String`]: `return \`${prefix}-${rand}\`;`
- **Line 609** [`Dollar symbol JSX/String`]: `designation: designation.trim() || existingMember?.designation || \`${assignedRole.toUpperCase()} - ${workspace.shortName}\`,`
- **Line 634** [`Dollar symbol JSX/String`]: `shiftHoursList: [\`${selectedShift?.startTime || '08:00'} - ${selectedShift?.endTime || '16:00'}\`],`
- **Line 637** [`Dollar symbol JSX/String`]: `shiftHours: \`${selectedShift?.startTime || '08:00'} - ${selectedShift?.endTime || '16:00'}\`,`
- **Line 723** [`Dollar symbol JSX/String`]: `link.setAttribute('download', \`${workspace.shortName}_Staff_Import_Template.csv\`);`
- **Line 774** [`Dollar symbol JSX/String`]: `shiftHoursList: [\`${matchedShift?.startTime || '08:00'} - ${matchedShift?.endTime || '16:00'}\`],`
- **Line 777** [`Dollar symbol JSX/String`]: `shiftHours: \`${matchedShift?.startTime || '08:00'} - ${matchedShift?.endTime || '16:00'}\`,`
- **Line 1376** [`Dollar symbol JSX/String`]: `<div style={{ width: \`${member.profileCompletion || 35}%\`, height: '100%', backgroundColor: '#ea580c', borderRadius: '999px' }} />`
- **Line 1831** [`Dollar symbol JSX/String`]: `width: \`${liveCompletion}%\`,`
- **Line 2299** [`Dollar symbol JSX/String`]: `value={\`${workspace.departmentName} (${workspace.departmentCode})\`}`

### `src/pages/department/departmentWorkspaceStore.ts` (3 locations)
- **Line 438** [`Dollar symbol JSX/String`]: `adminEmail: overrides?.adminEmail || \`${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com\`,`
- **Line 593** [`Dollar symbol JSX/String`]: `name: \`${r.roomNumber} - ${r.roomType}\`,`
- **Line 1183** [`Currency code USD`]: `currency: 'USD',`

## Doctor & Assistant Workstation (13 locations)

### `src/pages/doctor/DoctorAssistantDashboard.tsx` (5 locations)
- **Line 324** [`Dollar symbol JSX/String`]: `const bpString = \`${systolic || '120'}/${diastolic || '80'}\`;`
- **Line 333** [`Dollar symbol JSX/String`]: `triageNotes: \`${chiefComplaints}. Allergies: ${allergies.join(', ') || 'NKDA'}. Chronic: ${chronicConditions.join(', ') || 'None'}. Current Rx: ${currentMedications.join(', ') || 'None'}. RBS: ${rbs} mg/dL\`,`
- **Line 352** [`Dollar symbol JSX/String`]: `setChiefComplaints((prev) => (prev ? \`${prev}, ${sym}\` : sym));`
- **Line 410** [`Dollar symbol JSX/String`]: `showToast(\`✓ Document "${newDoc.title}" attached to ${activeIntakeToken.patient} (${activeIntakeToken.uhid})!\`);`
- **Line 1848** [`Dollar symbol JSX/String`]: `value={\`${activeIntakeToken?.patient || 'Patient'} (${activeIntakeToken?.uhid || ''})\`}`

### `src/pages/doctor/DoctorDashboard.tsx` (8 locations)
- **Line 242** [`Dollar symbol JSX/String`]: `bmi: activeToken.vitals.bmi ? \`${activeToken.vitals.bmi}\` : '24.0 (Normal)',`
- **Line 327** [`Dollar symbol JSX/String`]: `setChiefComplaints((prev) => (prev ? \`${prev}, ${sym}\` : sym));`
- **Line 532** [`Dollar symbol JSX/String`]: `technicianNote: \`${orderPriority} Order dispatched directly from ${doctorName}'s chamber\`,`
- **Line 1349** [`Dollar symbol JSX/String`]: `patientName: \`${activePatientProfile.firstName} ${activePatientProfile.lastName}\`,`
- **Line 2140** [`Dollar symbol JSX/String`]: `patientName: \`${activePatientProfile.firstName} ${activePatientProfile.lastName}\`,`
- **Line 2170** [`Dollar symbol JSX/String`]: `patientName: \`${activePatientProfile.firstName} ${activePatientProfile.lastName}\`,`
- **Line 2662** [`Hardcoded dollar amount ($123)`]: `<div style={{ fontSize: '2rem', fontWeight: 900, color: '#d97706', marginTop: '0.35rem' }}>$4,250.00</div>`
- **Line 2690** [`Dollar symbol JSX/String`]: `<div style={{ width: \`${d.pct}%\`, height: '100%', backgroundColor: d.color, borderRadius: '4px' }} />`

## Inpatient (IPD) Module (1 locations)

### `src/pages/ipd/IpdDashboard.tsx` (1 locations)
- **Line 359** [`Label with dollar sign`]: `Deposit: ${adm.advanceDeposit.toFixed(2)}`

## Laboratory Module (1 locations)

### `src/pages/lab/LabDashboard.tsx` (1 locations)
- **Line 422** [`Dollar symbol JSX/String`]: `<td><strong style={{ color: 'var(--primary)' }}>${t.price.toFixed(2)}</strong></td>`

## Operation Theatre (OT) Module (2 locations)

### `src/pages/ot/OtDashboard.tsx` (2 locations)
- **Line 546** [`Dollar symbol JSX/String`]: `<span>Estimated Surgical Cost: <strong>${surg.estimatedCost.toFixed(2)}</strong></span>`
- **Line 559** [`Dollar template ($${...})`]: `onClick={() => alert(\`OT Bill Generated: $${surg.estimatedCost.toFixed(2)} queued in Cashier desk.\`)}`

## Reception Module (50 locations)

### `src/pages/reception/components/CounterBillingModal.tsx` (13 locations)
- **Line 173** [`Dollar symbol JSX/String`]: `<strong>${baseConsultFee}.00</strong>`
- **Line 177** [`Dollar symbol JSX/String`]: `<strong>${regFee}.00</strong>`
- **Line 181** [`Dollar symbol JSX/String`]: `<strong>${triageFee}.00</strong>`
- **Line 185** [`Dollar symbol JSX/String`]: `<strong>${chamberFee}.00</strong>`
- **Line 190** [`Dollar symbol JSX/String`]: `<span>${subtotal}.00</span>`
- **Line 196** [`Money amount with .00 cents`]: `<span>-${discountAmount}.00</span>`
- **Line 202** [`Dollar symbol JSX/String`]: `<span style={{ color: '#0284c7' }}>${finalTotal}.00</span>`
- **Line 302** [`Dollar symbol JSX/String`]: `UPI ID: <code>northhospital.opd@icici</code> • Amount: <strong>${finalTotal}.00</strong>`
- **Line 368** [`Dollar symbol JSX/String`]: `<span>${baseConsultFee}.00</span>`
- **Line 372** [`Dollar symbol JSX/String`]: `<span>${regFee}.00</span>`
- **Line 376** [`Dollar symbol JSX/String`]: `<span>${triageFee}.00</span>`
- **Line 380** [`Dollar symbol JSX/String`]: `<span>${chamberFee}.00</span>`
- **Line 386** [`Dollar symbol JSX/String`]: `<span>${finalTotal}.00</span>`

### `src/pages/reception/components/DailyClosingReportModal.tsx` (4 locations)
- **Line 194** [`Dollar symbol JSX/String`]: `<strong style={{ textAlign: 'right' }}>${openingFloat}.00</strong>`
- **Line 198** [`Money amount with .00 cents`]: `<strong style={{ textAlign: 'right', color: '#15803d' }}>+${cashTotal}.00</strong>`
- **Line 202** [`Dollar symbol JSX/String`]: `<span style={{ textAlign: 'right', color: '#0284c7' }}>${expectedTotalCashInDrawer}.00</span>`
- **Line 232** [`Dollar template ($${...})`]: `{cashVariance === 0 ? '✓ Balanced ($0 Variance)' : \`⚠️ Variance: ${cashVariance > 0 ? '+' : ''}$${cashVariance}.00\`}`

### `src/pages/reception/components/DaycareBedModal.tsx` (2 locations)
- **Line 85** [`Dollar symbol JSX/String`]: `patientName: \`${selectedPatient.firstName} ${selectedPatient.lastName}\`,`
- **Line 397** [`Dollar symbol JSX/String`]: `<span style={{ color: '#0284c7' }}>${estimatedCharge}.00</span>`

### `src/pages/reception/components/PatientRegistrationWizardModal.tsx` (2 locations)
- **Line 136** [`Dollar symbol JSX/String`]: `emergencyContact: \`${emergencyContactName || 'Family'} (${emergencyRelation}) • ${emergencyPhone}\`,`
- **Line 137** [`Dollar symbol JSX/String`]: `insurance: insuranceType === 'Self Pay (Cash)' ? 'Self Pay (Cash)' : \`${insuranceType} • Pol# ${policyNumber || 'POL-PENDING'}\`,`

### `src/pages/reception/components/QuickWalkInModal.tsx` (6 locations)
- **Line 98** [`Dollar symbol JSX/String`]: `finalPatientName = \`${selectedPatientObj.firstName} ${selectedPatientObj.lastName}\`;`
- **Line 154** [`Dollar symbol JSX/String`]: `doctor: \`${selectedDoctorName} (${selectedDoctorObj?.dept || 'OPD'})\`,`
- **Line 478** [`Dollar symbol JSX/String`]: `<div style={{ fontWeight: 800, fontSize: '1rem', color: '#38bdf8' }}>${consultationFee}.00</div>`
- **Line 482** [`Dollar symbol JSX/String`]: `<div style={{ fontWeight: 800, fontSize: '1rem', color: '#a78bfa' }}>${triageFee}.00</div>`
- **Line 487** [`Dollar template ($${...})`]: `{patientMode === 'new' ? \`$${regFee}.00\` : '$0.00 (Exempt)'}`
- **Line 492** [`Dollar symbol JSX/String`]: `<div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#facc15' }}>${totalFee}.00</div>`

### `src/pages/reception/ReceptionDashboard.tsx` (23 locations)
- **Line 504** [`Dollar symbol JSX/String`]: `doctor: \`${selectedBookingDoctorObj.name} (${selectedBookingDoctorObj.dept})\`,`
- **Line 527** [`Dollar symbol JSX/String`]: `patient: \`${selectedBookingPatientObj.firstName} ${selectedBookingPatientObj.lastName}\`,`
- **Line 532** [`Dollar symbol JSX/String`]: `doctor: \`${selectedBookingDoctorObj.name} (${selectedBookingDoctorObj.dept})\`,`
- **Line 859** [`Dollar symbol JSX/String`]: `Opening Float: <strong style={{ color: 'var(--secondary)', fontWeight: 600 }}>${counterSession.openingFloat}.00</strong>`
- **Line 863** [`Dollar symbol JSX/String`]: `Total Collections: <strong style={{ color: 'var(--secondary)', fontWeight: 600 }}>${totalCollectionsToday}.00</strong>`
- **Line 867** [`Dollar symbol JSX/String`]: `Live In-Drawer Cash: <strong style={{ color: 'var(--secondary)', fontWeight: 700 }}>${counterSession.openingFloat + totalCollectionsToday}.00</strong>`
- **Line 949** [`Dollar template ($${...})`]: `value={\`$${totalCollectionsToday}.00\`}`
- **Line 950** [`Currency code USD`]: `trend="USD"`
- **Line 1141** [`Money amount with .00 cents`]: `${item.totalFee || 75}.00`
- **Line 1150** [`Money amount with .00 cents`]: `${item.totalFee || 75}.00`
- **Line 1491** [`Money amount with .00 cents`]: `${counterSession.openingFloat}.00`
- **Line 1498** [`Money amount with .00 cents`]: `${totalCollectionsToday}.00`
- **Line 1517** [`Money amount with .00 cents`]: `${counterSession.openingFloat + totalCollectionsToday}.00`
- **Line 1652** [`Dollar symbol JSX/String`]: `Standard OPD: <strong style={{ color: '#0284c7' }}>${doc.fee}</strong> • Follow-Up: <strong>${doc.followUpFee}</strong>`
- **Line 1672** [`Label with dollar sign`]: `Assigned to {selectedBookingDoctorObj.room} • Standard Tariff: ${selectedBookingDoctorObj.fee} | Follow-up: ${selectedBookingDoctorObj.followUpFee}`
- **Line 1729** [`Dollar template ($${...})`]: `{cat} {cat === 'Follow-Up' ? \`(Discounted $${selectedBookingDoctorObj.followUpFee})\` : ''}`
- **Line 1811** [`Label with dollar sign`]: `Total Tariff: $`
- **Line 1850** [`Money amount with .00 cents`]: `Total Collected: ${totalCollectionsToday}.00`
- **Line 1891** [`Dollar symbol JSX/String`]: `<td><strong>${inv.total}.00</strong></td>`
- **Line 1892** [`Dollar symbol JSX/String`]: `<td style={{ color: '#15803d', fontWeight: 800 }}>${inv.paid}.00</td>`
- **Line 2383** [`Dollar symbol JSX/String`]: `Tariff: <strong style={{ color: '#15803d' }}>${wardDailyTariff}.00 / 24h</strong> (${wardHourlyTariff}/hr)`
- **Line 2560** [`Dollar symbol JSX/String`]: `<strong style={{ color: '#15803d' }}>${Math.round(b.dailyTariff / 8) || 20}/hr</strong>`
- **Line 2635** [`Dollar symbol JSX/String`]: `<strong>${b.dailyTariff}/24h (${Math.round(b.dailyTariff / 8)}/hr)</strong>`

## Data Layer & Types (4 locations)

### `src/services/api.ts` (1 locations)
- **Line 12** [`Dollar symbol JSX/String`]: `: \`${cleanBaseURL}/api/v1\`;`

### `src/services/authResetService.ts` (1 locations)
- **Line 139** [`Dollar symbol JSX/String`]: `message: \`No staff member found matching "${identifier}". Please verify your Employee Code with Hospital Admin.\`,`

### `src/services/patientJourneyService.ts` (1 locations)
- **Line 1029** [`Hardcoded dollar amount ($123)`]: `notes: 'Daily counter opened with $150 opening float cash.',`

### `src/types/index.ts` (1 locations)
- **Line 184** [`Currency code USD`]: `currency: string;              // 'USD' ($)`

