// Formatting helpers and the printable report for the Pathologist views.
import type { HmsTone } from '../../../components/hms';
import type { ResultFlag } from '../data/pathologistStore';
import { paramFlag, signerOf } from '../data/pathologistStore';
import type { LabQueueOrder, SignedReportItem } from '../data/labDataStore';
import { ageSex } from '../data/labDataStore';

export const FLAG_TONE: Record<ResultFlag | 'Pending', HmsTone> = { Critical: 'red', Abnormal: 'amber', Normal: 'green', Pending: 'gray' };

export const FLAG_COLOR: Record<ResultFlag | 'Pending', string> = { Critical: '#dc2626', Abnormal: '#b45309', Normal: '#15803d', Pending: '#94a3b8' };

export const fmtRange = (low: number, high: number, unit: string) => `${low}–${high} ${unit}`;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Prints the signed report through the browser (Save as PDF works from the same dialog). */
export const printReport = (report: SignedReportItem, order?: LabQueueOrder) => {
  const e = escapeHtml;
  const rows = (order?.parameters || [])
    .map((p) => {
      const f = paramFlag(p);
      return `<tr><td>${e(p.name)}</td><td class="${f}">${p.observedValue ?? '—'} ${e(p.unit)}</td><td>${p.low}–${p.high} ${e(p.unit)}</td><td class="${f}">${f === 'Normal' ? '' : f}</td></tr>`;
    })
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e(report.reportNumber)}</title>
<style>
body{font-family:Inter,Arial,sans-serif;color:#111827;margin:32px;font-size:13px}
h1{font-size:20px;margin:0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#475569;margin:20px 0 6px}
.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 24px;margin-top:12px}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb}
.Critical{color:#dc2626;font-weight:700}.Abnormal{color:#b45309;font-weight:600}
.amend{border:1px solid #fde68a;background:#fffbeb;padding:8px 10px;border-radius:6px;margin-top:12px}
.sign{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:10px}
</style></head><body>
<h1>North Hospital · Diagnostic Laboratory</h1>
<div class="meta">
<div><b>Patient:</b> ${e(report.patientName)} (${e(ageSex(report.age, report.gender))})</div><div><b>Report:</b> ${e(report.reportNumber)}</div>
<div><b>UHID:</b> ${e(report.uhid)}</div><div><b>Order:</b> ${e(report.orderNumber)}</div>
<div><b>Test:</b> ${e(report.testName)} (${e(report.testCode)})</div><div><b>Signed:</b> ${e(report.signedAt)}</div>
<div><b>Referred by:</b> ${e(report.doctorName)}</div><div><b>Location:</b> ${e(report.location)}</div>
</div>
${report.isAmended ? `<div class="amend"><b>Amended report:</b> ${e(report.amendmentReason || '')}</div>` : ''}
${rows ? `<h2>Results</h2><table><thead><tr><th>Parameter</th><th>Result</th><th>Reference range</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
<h2>Key findings</h2><div>${e(report.keyFindings)}</div>
<h2>Interpretation</h2><div>${e(report.interpretation)}</div>
${(report.signature?.amendments || []).map((a) => `<h2>Addendum ${a.number}</h2><div>${e(a.text)} — ${e(a.signedByName || '')}</div>`).join('')}
<div class="sign">Electronically signed by ${e(signerOf(report) || 'the reporting pathologist')}${report.signature?.designation ? `, ${e(report.signature.designation)}` : ''}${report.signature?.hash ? `<br><span style="font-family:monospace;font-size:10px;color:#64748b">Fingerprint ${e(report.signature.hash.slice(0, 32))}</span>` : ''}</div>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
  return true;
};
