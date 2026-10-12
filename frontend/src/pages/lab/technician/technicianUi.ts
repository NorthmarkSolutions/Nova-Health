// Shared props and the printable specimen label for the Lab Technician views.
import type { TechnicianSnapshot } from '../data/technicianStore';
import type { LabQueueOrder } from '../data/labDataStore';

export interface TechnicianViewProps {
  data: TechnicianSnapshot;
  /** Signed-in technician's name, recorded on every bench action. */
  by: string;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string, filter?: string, select?: string) => void;
  /** Increments when Alt+N is pressed on this section. */
  newSignal: number;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
  /** Row to select on open (from a barcode scan: ?select=). */
  initialSelect?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Prints a 50 × 25 mm specimen label through the browser print dialog (any label printer installed as a printer). */
export const printSpecimenLabel = (o: LabQueueOrder) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.specimenNumber)}</title>
<style>@page{size:50mm 25mm;margin:2mm}body{font-family:Arial,sans-serif;margin:0;font-size:8pt;line-height:1.25}
.id{font-family:'Courier New',monospace;font-size:14pt;font-weight:700;letter-spacing:1px}.b{font-weight:700}</style></head><body>
<div class="id">*${esc(o.specimenNumber)}*</div>
<div class="b">${esc(o.patientName)} · ${o.age}${esc(o.gender)}</div>
<div>${esc(o.uhid)} · ${esc(o.orderNumber)}</div>
<div>${esc(o.testName)} · ${esc(o.sampleType)}</div>
<div class="b">${esc(o.priority.toUpperCase())}${o.collectedAt ? ` · coll ${esc(o.collectedAt)}` : ''}</div>
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
