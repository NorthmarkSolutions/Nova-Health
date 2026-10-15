// Front Desk & Reception — desk fee rules: what a visit costs and how a desk payment is recorded (invoice + paid token,
// which the billing sync then reports to the cashier).
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { DeskDoctor, ReceptionData, isCancelled, todayIso } from './receptionData';

export type VisitKind = 'WALK_IN' | 'FOLLOW_UP' | 'EMERGENCY';
export const feeFor = (doc: DeskDoctor | undefined, kind: VisitKind, data: ReceptionData, firstVisit: boolean) => {
  const consult = !doc ? 0 : kind === 'EMERGENCY' ? doc.emergencyFee : kind === 'FOLLOW_UP' ? doc.followUpFee : doc.fee;
  const triage = Number(data.tariff.triageVitalsFee) || 0;
  const reg = firstVisit ? Number(data.tariff.intakeRegistrationFee) || 0 : 0;
  return { consult, triage, reg, total: consult + triage + reg };
};

export const deskInvoiceNo = () => `INV-OPD-${Date.now().toString().slice(-6)}`;

/** The printed desk invoice (kept in the browser for reprinting; the money itself is recorded on the visit). */
export function recordDeskInvoice(t: SharedQueueToken, lines: Array<[string, number]>, invNo: string) {
  const total = lines.reduce((s, [, v]) => s + v, 0);
  patientJourneyService.addInvoice({
    id: `inv-${Date.now()}`,
    invNo,
    patientName: t.patient,
    uhid: t.uhid,
    phone: t.phone,
    category: 'OPD',
    date: todayIso(),
    subtotal: total,
    discount: 0,
    tax: 0,
    advanceDeducted: 0,
    total,
    paid: total,
    balance: 0,
    status: 'PAID',
    items: lines.filter(([, v]) => v > 0).map(([d, v]) => ({ source: d.startsWith('Consultation') ? 'Consultation' : 'Misc', description: d, qty: 1, unitPrice: v, total: v })),
  });
  return total;
}

/** Record a desk payment against an issued token: the visit is marked paid (server: cashier charge released,
 * Accounts posted) and the invoice is kept for printing. Resolves the invoice number, or null if refused. */
export async function recordDeskPayment(t: SharedQueueToken, mode: string, lines: Array<[string, number]>) {
  const invNo = t.invoiceNo || deskInvoiceNo();
  const total = lines.reduce((s, [, v]) => s + v, 0);
  if (!(await opdActions.deskFee(t, mode, invNo, total))) return null;
  recordDeskInvoice(t, lines, invNo);
  return invNo;
}


/** Money taken at the desk today, by payment mode. */
export const deskCollections = (queue: SharedQueueToken[]) => {
  const paid = queue.filter((t) => t.feePaid && !isCancelled(t));
  const by = (m: string) => paid.filter((t) => (t.paymentMode || '').toUpperCase() === m).reduce((s, t) => s + (t.totalFee || 0), 0);
  return { paid, cash: by('CASH'), upi: by('UPI'), card: by('CARD'), total: paid.reduce((s, t) => s + (t.totalFee || 0), 0) };
};
