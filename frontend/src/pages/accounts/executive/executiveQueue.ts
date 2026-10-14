// Accounts Executive · the overview work queue: everything the executive still has to act on.
import type { HmsTone } from '../../../components/hms';
import { ExecutiveSnapshot, humanize, isBankOpen, isDuplicateRisk, isMakerOpen } from './executiveData';

export interface WorkItem {
  key: string;
  tab: string;
  section: string;
  id: string;
  title: string;
  ref: string;
  status: string;
  amount: string | number;
  date?: string;
  todo: string;
  tone: HmsTone;
  filter?: string;
}

export const SECTION_LABEL: Record<string, string> = {
  events: 'Event inbox',
  journals: 'Journal entries',
  bills: 'Vendor bills',
  bank: 'Bank reconciliation',
  expenses: 'Expense requests',
  receivables: 'Receivables',
  gst: 'GST preparation',
  requests: 'My requests',
};

/** Everything the executive still has to act on, most urgent first. */
export const buildWorkQueue = (d: ExecutiveSnapshot): WorkItem[] => {
  const items: WorkItem[] = [];
  const add = (w: Omit<WorkItem, 'key' | 'section'>) => items.push({ ...w, key: `${w.tab}:${w.id}`, section: SECTION_LABEL[w.tab] });

  d.requests
    .filter((r) => r.status === 'returned')
    .forEach((r) => add({ tab: 'requests', id: r.id, title: `${humanize(r.document_type)} returned`, ref: r.reference_no, status: r.status, amount: r.amount, date: r.submitted_at, todo: 'The approver sent this back. Correct it and submit again.', tone: 'amber', filter: 'returned' }));
  d.bills
    .filter((b) => isMakerOpen(b.status) && isDuplicateRisk(b))
    .forEach((b) => add({ tab: 'bills', id: b.id, title: `${b.vendor?.name || 'Vendor bill'} · duplicate risk`, ref: b.reference_no, status: b.status, amount: b.net_payable, date: b.invoice_date, todo: `${b.duplicate_score}% match with another invoice. Check the original before submitting.`, tone: 'red', filter: 'duplicates' }));
  d.events
    .filter((e) => e.status === 'pending_validation' || e.status === 'received')
    .forEach((e) => add({ tab: 'events', id: e.id, title: humanize(e.event_type), ref: e.event_id, status: e.status, amount: e.amount, date: e.business_date, todo: `From ${humanize(e.source_department)}. Validate it for posting or reject it with a reason.`, tone: 'blue', filter: 'pending' }));
  d.journals
    .filter((j) => isMakerOpen(j.status))
    .forEach((j) => add({ tab: 'journals', id: j.id, title: j.description || 'Journal voucher', ref: j.reference_no, status: j.status, amount: j.total_debit, date: j.journal_date, todo: j.status === 'returned' ? 'Returned by the approver. Correct and resubmit.' : 'Draft not yet submitted for approval.', tone: j.status === 'returned' ? 'amber' : 'gray', filter: 'open' }));
  d.bills
    .filter((b) => isMakerOpen(b.status) && !isDuplicateRisk(b))
    .forEach((b) => add({ tab: 'bills', id: b.id, title: b.vendor?.name || 'Vendor bill', ref: b.reference_no, status: b.status, amount: b.net_payable, date: b.invoice_date, todo: 'Bill not yet submitted for approval.', tone: 'gray', filter: 'open' }));
  d.bank
    .filter(isBankOpen)
    .filter((t) => t.match_status !== 'for_review')
    .forEach((t) => add({ tab: 'bank', id: t.id, title: t.narration || 'Bank line', ref: t.bank_reference || '—', status: t.match_status, amount: t.amount, date: t.txn_date, todo: 'Match it to a receipt or payment, or flag it for review.', tone: 'blue', filter: 'open' }));
  d.expenses
    .filter((e) => isMakerOpen(e.status))
    .forEach((e) => add({ tab: 'expenses', id: e.id, title: humanize(e.expense_type), ref: e.reference_no, status: e.status, amount: e.amount, date: e.created_at, todo: 'Expense request not yet submitted for approval.', tone: 'gray', filter: 'open' }));
  d.receivables
    .filter((r) => r.aging_bucket === '90_plus' && r.status !== 'settled' && r.status !== 'written_off')
    .forEach((r) => add({ tab: 'receivables', id: r.id, title: r.customer?.name || r.patient_name || 'Receivable', ref: r.reference_no, status: r.status, amount: r.outstanding_amount, date: r.due_date, todo: 'Over 90 days. Log a follow-up with the payer.', tone: 'red', filter: '90_plus' }));
  d.gst
    .filter((g) => g.status === 'draft')
    .forEach((g) => add({ tab: 'gst', id: g.id, title: g.direction === 'outward' ? 'GSTR-1 outward batch' : 'GSTR-3B ITC batch', ref: g.reference_no, status: g.status, amount: g.tax_value, date: g.period_to, todo: 'Draft batch. Check the lines and submit for review.', tone: 'gray', filter: 'draft' }));
  return items;
};
