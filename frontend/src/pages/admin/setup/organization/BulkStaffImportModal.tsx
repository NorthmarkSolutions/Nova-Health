import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileText,
  Trash2,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  StaffMember,
  StaffRole,
  StaffStatus,
  HospitalShift,
  getHospitalStaff,
  bulkAddHospitalStaff,
} from './hospitalStaffStore';
import {
  downloadStaffImportTemplate,
  downloadErrorReport,
  parseCSV,
  FailedImportRecord,
} from './staffTemplateGenerator';

interface BulkStaffImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDepartments: { id: string; name: string }[];
  availableShifts: HospitalShift[];
  onImportSuccess?: (count: number) => void;
}

interface ParsedRowResult {
  rowNumber: number;
  isValid: boolean;
  reasons: string[];
  staff?: StaffMember;
  raw: Record<string, string>;
}

export const BulkStaffImportModal: React.FC<BulkStaffImportModalProps> = ({
  isOpen,
  onClose,
  availableDepartments,
  availableShifts,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ParsedRowResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'failed'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing codes in store to avoid duplicate employee codes
  const existingStaff = useMemo(() => getHospitalStaff(), [isOpen]);
  const existingCodeSet = useMemo(
    () => new Set(existingStaff.map((s) => s.employeeCode.trim().toUpperCase())),
    [existingStaff]
  );

  if (!isOpen) return null;

  // Normalized department lookup map (lowercase name -> { id, name })
  const deptMap = new Map<string, { id: string; name: string }>();
  availableDepartments.forEach((d) => {
    deptMap.set(d.name.trim().toLowerCase(), d);
  });

  // Normalized shift lookup map (lowercase name -> HospitalShift)
  const shiftMap = new Map<string, HospitalShift>();
  availableShifts.forEach((s) => {
    shiftMap.set(s.name.trim().toLowerCase(), s);
    shiftMap.set(s.code.trim().toLowerCase(), s);
  });

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setIsProcessing(false);
          return;
        }
        processCsvContent(text);
      } catch (err) {
        console.error('Failed reading file', err);
        alert('Failed to read file format. Please ensure it is a valid CSV/Excel export.');
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const processCsvContent = (content: string) => {
    const rawMatrix = parseCSV(content);
    if (rawMatrix.length < 2) {
      setResults([]);
      setIsProcessing(false);
      return;
    }

    // Clean headers: lowercase and remove special characters
    const headerRow = rawMatrix[0].map((h) =>
      h.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    );

    const findCol = (keys: string[]) => {
      return headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
    };

    const codeIdx = findCol(['employeecode', 'code', 'empid', 'staffid']);
    const nameIdx = findCol(['fullname', 'name', 'employeename']);
    const roleIdx = findCol(['rolecadre', 'role', 'cadre']);
    const desigIdx = findCol(['designation', 'position', 'title']);
    const deptIdx = findCol(['department', 'dept']);
    const shiftIdx = findCol(['shift', 'workinghours']);
    const phoneIdx = findCol(['phone', 'contact', 'mobile']);
    const emailIdx = findCol(['email', 'mail']);
    const statusIdx = findCol(['status', 'state']);

    const fileCodesEncountered = new Set<string>();
    const parsedResults: ParsedRowResult[] = [];

    for (let i = 1; i < rawMatrix.length; i++) {
      const row = rawMatrix[i];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
        continue; // skip empty line
      }

      const rowNumber = i + 1;
      const rawObj: Record<string, string> = {
        employeecode: codeIdx !== -1 ? (row[codeIdx] || '').trim() : '',
        fullname: nameIdx !== -1 ? (row[nameIdx] || '').trim() : '',
        role: roleIdx !== -1 ? (row[roleIdx] || '').trim() : '',
        designation: desigIdx !== -1 ? (row[desigIdx] || '').trim() : '',
        department: deptIdx !== -1 ? (row[deptIdx] || '').trim() : '',
        shift: shiftIdx !== -1 ? (row[shiftIdx] || '').trim() : '',
        phone: phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '',
        email: emailIdx !== -1 ? (row[emailIdx] || '').trim() : '',
        status: statusIdx !== -1 ? (row[statusIdx] || '').trim() : '',
      };

      const reasons: string[] = [];

      // 1. Mandatory Employee Code check
      const empCode = rawObj.employeecode;
      if (!empCode) {
        reasons.push('Employee Code is required.');
      } else {
        const upperCode = empCode.toUpperCase();
        if (existingCodeSet.has(upperCode)) {
          reasons.push(`Employee Code "${empCode}" already exists in Staff Master.`);
        } else if (fileCodesEncountered.has(upperCode)) {
          reasons.push(`Duplicate Employee Code "${empCode}" within this file.`);
        } else {
          fileCodesEncountered.add(upperCode);
        }
      }

      // 2. Mandatory Full Name check
      const fullName = rawObj.fullname;
      if (!fullName) {
        reasons.push('Full Name is required.');
      }

      // 3. Role/Cadre check
      let role: StaffRole = 'doctor';
      const roleStr = rawObj.role.toLowerCase();
      if (!roleStr) {
        reasons.push('Role/Cadre is required.');
      } else if (roleStr.includes('doc')) {
        role = 'doctor';
      } else if (roleStr.includes('nur')) {
        role = 'nurse';
      } else if (roleStr.includes('tech') || roleStr.includes('lab') || roleStr.includes('rad')) {
        role = 'technician';
      } else if (roleStr.includes('para') || roleStr.includes('emt')) {
        role = 'paramedic';
      } else if (roleStr.includes('adm') || roleStr.includes('mgr') || roleStr.includes('clerk')) {
        role = 'admin';
      } else if (roleStr.includes('sup') || roleStr.includes('aide')) {
        role = 'support';
      } else {
        reasons.push(`Invalid role "${rawObj.role}". Must be Doctor, Nurse, Technician, Paramedic, Admin, or Support.`);
      }

      // 4. Designation check
      const designation = rawObj.designation;
      if (!designation) {
        reasons.push('Designation is required.');
      }

      // 5. Department check (supports multiple separated by ';' or ',')
      const rawDeptStr = rawObj.department;
      const matchedDeptIds: string[] = [];
      const matchedDeptNames: string[] = [];

      if (!rawDeptStr) {
        reasons.push('At least one Department is required.');
      } else {
        const splitDepts = rawDeptStr.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
        const invalidDepts: string[] = [];

        for (const targetName of splitDepts) {
          const lower = targetName.toLowerCase();
          // Find exact or partial match
          let found = deptMap.get(lower);
          if (!found) {
            // Check substring match
            for (const [key, val] of deptMap.entries()) {
              if (key.includes(lower) || lower.includes(key)) {
                found = val;
                break;
              }
            }
          }

          if (found) {
            if (!matchedDeptIds.includes(found.id)) {
              matchedDeptIds.push(found.id);
              matchedDeptNames.push(found.name);
            }
          } else {
            invalidDepts.push(targetName);
          }
        }

        if (invalidDepts.length > 0) {
          reasons.push(`Department(s) not found in hospital master: "${invalidDepts.join(', ')}".`);
        }
      }

      // 6. Shift check (supports multiple separated by ';' or ',')
      const rawShiftStr = rawObj.shift;
      const matchedShiftIds: string[] = [];
      const matchedShiftNames: string[] = [];
      const matchedShiftHours: string[] = [];

      if (!rawShiftStr) {
        reasons.push('At least one Shift is required.');
      } else {
        const splitShifts = rawShiftStr.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
        const invalidShifts: string[] = [];

        for (const targetShift of splitShifts) {
          const lower = targetShift.toLowerCase();
          let found = shiftMap.get(lower);
          if (!found) {
            for (const [key, val] of shiftMap.entries()) {
              if (key.includes(lower) || lower.includes(key)) {
                found = val;
                break;
              }
            }
          }

          if (found) {
            if (!matchedShiftIds.includes(found.id)) {
              matchedShiftIds.push(found.id);
              matchedShiftNames.push(found.name);
              matchedShiftHours.push(`${found.startTime} - ${found.endTime}`);
            }
          } else {
            invalidShifts.push(targetShift);
          }
        }

        if (invalidShifts.length > 0) {
          reasons.push(`Shift(s) not recognized: "${invalidShifts.join(', ')}".`);
        }
      }

      // 7. Status check
      let status: StaffStatus = 'ACTIVE';
      const rawStatus = rawObj.status.toLowerCase();
      if (!rawStatus || rawStatus.includes('act')) {
        status = 'ACTIVE';
      } else if (rawStatus.includes('leave')) {
        status = 'ON_LEAVE';
      } else if (rawStatus.includes('suspend')) {
        status = 'SUSPENDED';
      } else if (rawStatus.includes('resign') || rawStatus.includes('inact') || rawStatus.includes('term')) {
        status = 'RESIGNED';
      } else {
        reasons.push(`Invalid status "${rawObj.status}". Allowed: Active, On Leave, Suspended, Resigned.`);
      }

      const isValid = reasons.length === 0;

      let staff: StaffMember | undefined;
      if (isValid) {
        staff = {
          id: `stf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          employeeCode: empCode,
          fullName,
          role,
          designation,
          departmentIds: matchedDeptIds,
          departmentNames: matchedDeptNames,
          departmentId: matchedDeptIds[0],
          departmentName: matchedDeptNames[0],
          shiftIds: matchedShiftIds,
          shiftNames: matchedShiftNames,
          shiftHoursList: matchedShiftHours,
          shiftId: matchedShiftIds[0] || 'shift-morn',
          shiftName: matchedShiftNames[0] || 'Morning Shift',
          shiftHours: matchedShiftHours[0] || '08:00 - 16:00',
          phone: rawObj.phone || '',
          email: rawObj.email || '',
          status,
          joiningDate: new Date().toISOString().slice(0, 10),
        };
      }

      parsedResults.push({
        rowNumber,
        isValid,
        reasons,
        staff,
        raw: rawObj,
      });
    }

    setResults(parsedResults);
    setIsProcessing(false);
  };

  const validCount = results?.filter((r) => r.isValid).length || 0;
  const failedCount = results?.filter((r) => !r.isValid).length || 0;
  const totalCount = results?.length || 0;

  const displayedResults = useMemo(() => {
    if (!results) return [];
    if (activeTab === 'valid') return results.filter((r) => r.isValid);
    if (activeTab === 'failed') return results.filter((r) => !r.isValid);
    return results;
  }, [results, activeTab]);

  const handleDownloadErrorReport = () => {
    if (!results) return;
    const failedRecords: FailedImportRecord[] = results
      .filter((r) => !r.isValid)
      .map((r) => ({
        rowNumber: r.rowNumber,
        employeeCode: r.raw.employeecode,
        fullName: r.raw.fullname,
        reasons: r.reasons,
        rawData: r.raw,
      }));

    downloadErrorReport(failedRecords);
  };

  const handleCommitImport = () => {
    if (!results) return;
    const validStaffMembers = results.filter((r) => r.isValid && r.staff).map((r) => r.staff!);
    if (validStaffMembers.length === 0) return;

    bulkAddHospitalStaff(validStaffMembers);
    if (onImportSuccess) {
      onImportSuccess(validStaffMembers.length);
    }
    onClose();
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Bulk Import Hospital Staff
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload CSV or Excel spreadsheet to batch enroll hospital personnel into departments & shifts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadStaffImportTemplate(availableDepartments, availableShifts)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!results ? (
            /* Upload Zone */
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Choose an Excel/CSV file or drag & drop it here
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                  Supports comma-separated values (.csv) and Excel exports. File should follow the standard
                  9-column schema (Employee Code, Full Name, Role, Designation, Department, Shift, Phone, Email, Status).
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-sm hover:bg-teal-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  Select File from Computer
                </div>
              </div>

              {/* Step instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[11px]">
                      1
                    </span>
                    Download Template
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Get pre-configured template with existing hospital departments and active shifts listed.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[11px]">
                      2
                    </span>
                    Fill Staff Data
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Enter employee codes, names, roles, and semicolon-delimited multi-departments/shifts.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[11px]">
                      3
                    </span>
                    Validate & Import
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Review validation checks, export error reports if any rows fail, and commit valid staff.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Results & Validation Summary */
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Records
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {totalCount}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Valid Records
                    </span>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                      {validCount}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Failed Records
                    </span>
                    <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                      {failedCount}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Action Bar & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'valid'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('failed')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'failed'
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-700'
                    }`}
                  >
                    Failed ({failedCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {failedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadErrorReport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Error Report ({failedCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Upload Different File
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Validation</th>
                      <th className="px-3 py-2.5">Emp Code</th>
                      <th className="px-3 py-2.5">Full Name</th>
                      <th className="px-3 py-2.5">Role</th>
                      <th className="px-3 py-2.5">Department(s)</th>
                      <th className="px-3 py-2.5">Shift(s)</th>
                      <th className="px-3 py-2.5">Errors / Reasons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {displayedResults.map((item) => (
                      <tr
                        key={item.rowNumber}
                        className={
                          item.isValid
                            ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                            : 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50'
                        }
                      >
                        <td className="px-3 py-2.5 font-mono text-slate-400">
                          #{item.rowNumber}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                          {item.staff?.employeeCode || item.raw.employeecode || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                          {item.staff?.fullName || item.raw.fullname || '-'}
                        </td>
                        <td className="px-3 py-2.5 capitalize text-slate-700 dark:text-slate-300">
                          {item.staff?.role || item.raw.role || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                          {item.staff?.departmentNames?.join(', ') || item.raw.department || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                          {item.staff?.shiftNames?.map((s) => s.split('(')[0].trim()).join(', ') ||
                            item.raw.shift ||
                            '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.reasons.length > 0 ? (
                            <ul className="text-[11px] text-rose-600 dark:text-rose-400 list-disc list-inside space-y-0.5 max-w-xs">
                              {item.reasons.map((r, idx) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                              Ready for onboarding
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {results ? (
              <span>
                Ready to import <strong className="text-emerald-600 dark:text-emerald-400">{validCount}</strong> valid staff members
              </span>
            ) : (
              <span>Download the sample template if you need column reference</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            {results && validCount > 0 && (
              <button
                type="button"
                onClick={handleCommitImport}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Import {validCount} Valid Record{validCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
