import { HospitalShift } from './hospitalStaffStore';

export interface StaffTemplateRow {
  employeeCode: string;
  fullName: string;
  role: string;
  designation: string;
  department: string;
  shift: string;
  phone: string;
  email: string;
  status: string;
}

export interface FailedImportRecord {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  reasons: string[];
  rawData: Record<string, string>;
}

/**
 * Escapes a field for CSV export according to RFC 4180
 */
function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers a client-side file download with UTF-8 BOM so Excel opens it without character corruption.
 */
function triggerFileDownload(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads the Hospital Staff Import Template (.csv)
 * Populates sample rows using existing hospital departments and shifts.
 */
export function downloadStaffImportTemplate(
  availableDepartments: { id: string; name: string }[] = [],
  availableShifts: HospitalShift[] = []
): void {
  const headers = [
    'Employee Code',
    'Full Name',
    'Role/Cadre',
    'Designation',
    'Department',
    'Shift',
    'Phone',
    'Email',
    'Status',
  ];

  const primaryDept = availableDepartments[0]?.name || 'Outpatient Department (OPD)';
  const secondaryDept = availableDepartments[1]?.name || 'Emergency & Trauma (ER)';
  const combinedDepts = `${primaryDept}; ${secondaryDept}`;

  const primaryShift = availableShifts[0]?.name || 'Morning Shift (OPD & General Wards)';
  const secondaryShift = availableShifts[1]?.name || 'Evening Shift (Inpatient & OT Support)';
  const combinedShifts = `${primaryShift}; ${secondaryShift}`;

  // Sample guidance rows
  const sampleRows: string[][] = [
    [
      'DOC-201',
      'Dr. William Foster',
      'Doctor',
      'Senior Consultant Cardiologist',
      combinedDepts,
      combinedShifts,
      '+1 (555) 301-4455',
      'william.foster@northhospital.com',
      'Active',
    ],
    [
      'NUR-305',
      'Nurse Sarah Connor',
      'Nurse',
      'Senior ICU Charge Nurse',
      secondaryDept,
      primaryShift,
      '+1 (555) 412-9988',
      'sarah.connor@northhospital.com',
      'Active',
    ],
    [
      'TCH-402',
      'Alan Turing',
      'Technician',
      'Chief MRI & Imaging Technologist',
      primaryDept,
      primaryShift,
      '+1 (555) 678-1122',
      'alan.turing@northhospital.com',
      'Active',
    ],
    [
      'ADM-108',
      'Claire Fisher',
      'Admin',
      'Patient Admissions Coordinator',
      primaryDept,
      primaryShift,
      '+1 (555) 890-3344',
      'claire.fisher@northhospital.com',
      'On Leave',
    ],
  ];

  const csvLines: string[] = [
    headers.map(escapeCsvField).join(','),
    ...sampleRows.map((row) => row.map(escapeCsvField).join(',')),
  ];

  const filename = `NorthHospital_Staff_Import_Template_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvLines.join('\r\n'));
}

/**
 * Generates and downloads the Error Report for failed records during bulk staff import.
 */
export function downloadErrorReport(failedRecords: FailedImportRecord[]): void {
  const headers = [
    'Row Number',
    'Employee Code',
    'Full Name',
    'Failure Reasons',
    'Role/Cadre',
    'Designation',
    'Department',
    'Shift',
    'Phone',
    'Email',
    'Status',
  ];

  const rows = failedRecords.map((item) => [
    String(item.rowNumber),
    item.employeeCode || item.rawData['employeecode'] || 'N/A',
    item.fullName || item.rawData['fullname'] || 'N/A',
    item.reasons.join(' | '),
    item.rawData['role/cadre'] || item.rawData['role'] || '',
    item.rawData['designation'] || '',
    item.rawData['department'] || '',
    item.rawData['shift'] || '',
    item.rawData['phone'] || '',
    item.rawData['email'] || '',
    item.rawData['status'] || '',
  ]);

  const csvLines: string[] = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ];

  const filename = `NorthHospital_Staff_Import_Error_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvLines.join('\r\n'));
}

/**
 * Robust CSV parser that properly parses quoted values, commas, and newlines.
 */
export function parseCSV(text: string): string[][] {
  const p: string[][] = [];
  let row: string[] = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      p.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
    p.push(row);
  }
  return p;
}
