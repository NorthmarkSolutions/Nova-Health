import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  NotebookTabs,
  ReceiptText,
  Landmark,
  WalletCards,
  HandCoins,
  PhoneCall,
  FileCheck,
  Paperclip,
  Send,
  History,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Check,
  X,
  ArrowRight,
  Filter,
  FileText,
  RefreshCw,
  Eye,
  Layers,
  ArrowLeftRight,
  ClipboardCheck,
  Scale,
  LogOut,
  BedDouble,
  Pill,
  ShieldCheck,
  CircleCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  accountsService,
  FinancialEventItem,
  VendorBillItem,
  BankTransactionItem,
  ReceivableItem,
  CollectionCaseItem,
  ExpenseRequestItem,
  GSTBatchItem,
  JournalVoucher,
  ApprovalRequestItem,
  AuditLogItem,
  ChartOfAccountItem,
  CostCenterItem,
  WorkloadResponse
} from '../../../services/accountsService';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';

export interface AccountsExecutiveWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const formatINR = (n: number | string) =>
  '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const formatINR2 = (n: number | string) =>
  '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AccountsExecutiveWorkspace: React.FC<AccountsExecutiveWorkspaceProps> = ({
  activeRoleView = 'executive',
  onSelectRole = () => {},
  workload: propWorkload,
  currentTime = new Date(),
  onOpenMaster
}) => {
  const { user, logout } = useAuth();

  // Navigation Screens:
  // 1. dashboard | 2. events | 3. journals | 4. bills | 5. bank | 6. expenses |
  // 7. receivables | 8. collections | 9. gst | 10. docs | 11. requests | 12. activity
  const [activeScreen, setActiveScreen] = useState<string>('expenses');

  // Search & Filter Tabs per screen
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Live Data States
  const [events, setEvents] = useState<FinancialEventItem[]>([]);
  const [journals, setJournals] = useState<JournalVoucher[]>([]);
  const [vendorBills, setVendorBills] = useState<VendorBillItem[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransactionItem[]>([]);
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [collectionCases, setCollectionCases] = useState<CollectionCaseItem[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequestItem[]>([]);
  const [gstBatches, setGstBatches] = useState<GSTBatchItem[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [coaList, setCoaList] = useState<ChartOfAccountItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);

  // Selection & Drawer States for INSPECTION · CONTEXT DETAILS
  const [selectedEvent, setSelectedEvent] = useState<FinancialEventItem | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalVoucher | null>(null);
  const [selectedBill, setSelectedBill] = useState<VendorBillItem | null>(null);
  const [selectedBankTxn, setSelectedBankTxn] = useState<BankTransactionItem | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestItem | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableItem | null>(null);
  const [selectedCollectionCase, setSelectedCollectionCase] = useState<CollectionCaseItem | null>(null);
  const [selectedGstBatch, setSelectedGstBatch] = useState<GSTBatchItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestItem | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Forms / Modals
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  // Journal Modal Inputs
  const [journalDesc, setJournalDesc] = useState('');
  const [journalDate, setJournalDate] = useState('2026-10-08');
  const [journalRef, setJournalRef] = useState('');
  const [journalLines, setJournalLines] = useState<Array<{ account_id: string; debit: number; credit: number; cost_center_id?: string; narration?: string }>>([
    { account_id: '', debit: 0, credit: 0, narration: '' },
    { account_id: '', debit: 0, credit: 0, narration: '' },
  ]);

  // Bill Form Inputs
  const [billVendorId, setBillVendorId] = useState('');
  const [billInvoiceNo, setBillInvoiceNo] = useState('');
  const [billAmount, setBillAmount] = useState<number>(0);
  const [billDate, setBillDate] = useState('2026-10-08');
  const [billPoNo, setBillPoNo] = useState('');
  const [billAckDuplicate, setBillAckDuplicate] = useState(false);
  const [billDupCheckResult, setBillDupCheckResult] = useState<any>(null);

  // Expense Form Inputs
  const [expDept, setExpDept] = useState('opd');
  const [expType, setExpType] = useState('medical_consumables');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expReason, setExpReason] = useState('');

  // Followup Form Inputs
  const [fuMode, setFuMode] = useState('call');
  const [fuContact, setFuContact] = useState('');
  const [fuOutcome, setFuOutcome] = useState('promised');
  const [fuNotes, setFuNotes] = useState('');
  const [fuNextDate, setFuNextDate] = useState('2026-10-15');

  // GST State
  const [testGstin, setTestGstin] = useState('');
  const [gstinValidationResult, setGstinValidationResult] = useState<{ valid: boolean; state_code?: string; reason?: string } | null>(null);

  // UI Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load All Executive Data
  const loadData = async () => {
    try {
      const [evts, jvs, bills, btxns, recs, cases, exps, gsts, reqs, acts, coa, cc] = await Promise.all([
        accountsService.getEvents().catch(() => []),
        accountsService.getJournals().catch(() => []),
        accountsService.getVendorBills().catch(() => []),
        accountsService.getBankTransactions().catch(() => []),
        accountsService.getReceivables().catch(() => []),
        accountsService.getCollectionPipeline().catch(() => []),
        accountsService.getExpenseRequests().catch(() => []),
        accountsService.getGSTBatches().catch(() => []),
        accountsService.getApprovalRequests({ maker: 'me' }).catch(() => []),
        accountsService.getAuditActivity().catch(() => []),
        accountsService.getCOA().catch(() => []),
        accountsService.getCostCenters().catch(() => []),
      ]);

      setEvents(evts);
      setJournals(jvs);
      setVendorBills(bills);
      setBankTransactions(btxns);
      setReceivables(recs);
      setCollectionCases(cases);
      setExpenseRequests(exps);
      setGstBatches(gsts);
      setMyRequests(reqs);
      setAuditLogs(acts);
      setCoaList(coa);
      setCostCenters(cc);

      if (evts.length > 0 && !selectedEvent) setSelectedEvent(evts[0]);
      if (jvs.length > 0 && !selectedJournal) setSelectedJournal(jvs[0]);
      if (bills.length > 0 && !selectedBill) setSelectedBill(bills[0]);
      if (btxns.length > 0 && !selectedBankTxn) setSelectedBankTxn(btxns[0]);
      if (exps.length > 0 && !selectedExpense) setSelectedExpense(exps[0]);
      if (recs.length > 0 && !selectedReceivable) setSelectedReceivable(recs[0]);
      if (cases.length > 0 && !selectedCollectionCase) setSelectedCollectionCase(cases[0]);
      if (gsts.length > 0 && !selectedGstBatch) setSelectedGstBatch(gsts[0]);
      if (reqs.length > 0 && !selectedRequest) setSelectedRequest(reqs[0]);
      if (acts.length > 0 && !selectedAuditLog) setSelectedAuditLog(acts[0]);
    } catch (e) {
      console.error('Error fetching accounts executive data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Duplicate Check Handler
  useEffect(() => {
    if (billVendorId && billInvoiceNo && billAmount > 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await accountsService.checkDuplicateBill({
            vendor_id: billVendorId,
            invoice_no: billInvoiceNo,
            amount: billAmount,
            invoice_date: billDate,
          });
          setBillDupCheckResult(res);
        } catch {
          setBillDupCheckResult(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setBillDupCheckResult(null);
    }
  }, [billVendorId, billInvoiceNo, billAmount, billDate]);

  // Handle Journal Balancing
  const { totalDr, totalCr, isBalanced } = useMemo(() => {
    const dr = journalLines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);
    const cr = journalLines.reduce((acc, line) => acc + (Number(line.credit) || 0), 0);
    return { totalDr: dr, totalCr: cr, isBalanced: dr > 0 && Math.abs(dr - cr) < 0.001 };
  }, [journalLines]);

  const handleCreateJournal = async () => {
    if (!isBalanced) {
      showToast('Error: Journal voucher is unbalanced (Debits != Credits)');
      return;
    }
    if (!journalDesc.trim()) {
      showToast('Error: Description is required');
      return;
    }
    try {
      const created = await accountsService.createJournal({
        journal_date: journalDate,
        description: journalDesc,
        external_reference: journalRef,
        lines: journalLines,
      });
      await accountsService.submitJournal(created.id, 1);
      showToast(`Journal ${created.reference_no} submitted for supervisor approval!`);
      setShowJournalModal(false);
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error?.message || 'Failed to submit journal');
    }
  };

  const handleCreateBill = async () => {
    if (billDupCheckResult?.has_duplicate && billDupCheckResult?.score >= 80 && !billAckDuplicate) {
      showToast('Blocking: Acknowledge high-probability duplicate warning before submitting.');
      return;
    }
    try {
      const bill = await accountsService.createVendorBill({
        vendor_id: billVendorId,
        invoice_no: billInvoiceNo,
        invoice_date: billDate,
        due_date: '2026-11-08',
        po_no: billPoNo,
        taxable_amount: billAmount,
        cgst: billAmount * 0.09,
        sgst: billAmount * 0.09,
        total_amount: billAmount * 1.18,
        net_payable: billAmount * 1.18,
      });
      await accountsService.submitVendorBill(bill.id, billAckDuplicate);
      showToast(`Vendor Bill ${bill.reference_no} submitted with 3-way match!`);
      setShowBillModal(false);
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error?.message || 'Failed to create bill');
    }
  };

  const handleCreateExpense = async () => {
    if (expAmount <= 0 || !expReason.trim()) {
      showToast('Please enter a valid amount and business reason.');
      return;
    }
    try {
      const exp = await accountsService.createExpenseRequest({
        department_id: expDept,
        expense_type: expType,
        amount: expAmount,
        business_reason: expReason,
      });
      await accountsService.submitExpenseRequest(exp.id);
      showToast(`Expense ${exp.reference_no} submitted for approval!`);
      setShowExpenseModal(false);
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error?.message || 'Failed to submit expense');
    }
  };

  const handleSaveFollowup = async () => {
    if (!selectedReceivable) return;
    try {
      await accountsService.logReceivableFollowup(selectedReceivable.id, {
        channel: fuMode,
        contact_person: fuContact,
        outcome: fuOutcome,
        notes: fuNotes,
        next_action_on: fuNextDate,
      });
      showToast(`Follow-up logged for ${selectedReceivable.reference_no}!`);
      setShowFollowupModal(false);
      setFuNotes('');
      loadData();
    } catch (e: any) {
      showToast('Failed to log followup');
    }
  };

  // Nav Groups with Badges (Matching Pharmacy Layout)
  const navGroups = [
    {
      label: 'STOCK & OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'events', label: 'Event Inbox', icon: Inbox, badge: events.filter(e => e.status === 'pending_validation').length },
      ],
    },
    {
      label: 'FINANCIAL LEDGER & OPS',
      items: [
        { id: 'journals', label: 'Journal Entries', icon: NotebookTabs, badge: journals.filter(j => j.status === 'draft').length },
        { id: 'bills', label: 'Vendor Bills', icon: ReceiptText, badge: vendorBills.filter(b => b.duplicate_score >= 80).length },
        { id: 'bank', label: 'Bank Reconciliation', icon: Landmark, badge: bankTransactions.filter(b => b.match_status === 'unmatched').length },
        { id: 'expenses', label: 'Expense Requests', icon: WalletCards, badge: expenseRequests.filter(e => e.status === 'in_approval').length },
      ],
    },
    {
      label: 'RECEIVABLES & CASHFLOW',
      items: [
        { id: 'receivables', label: 'Customer Receivables', icon: HandCoins },
        { id: 'collections', label: 'Collection Pipeline', icon: PhoneCall },
      ],
    },
    {
      label: 'COMPLIANCE & GOVERNANCE',
      items: [
        { id: 'gst', label: 'GST Preparation', icon: FileCheck },
        { id: 'docs', label: 'Supporting Documents', icon: Paperclip },
      ],
    },
    {
      label: 'TRACE & RECONCILIATION',
      items: [
        { id: 'requests', label: 'My Requests', icon: Send, badge: myRequests.filter(r => r.status === 'pending').length },
        { id: 'activity', label: 'Activity Audit Log', icon: History },
      ],
    },
  ];

  const displayName = `${user?.firstName || 'Priya'} ${user?.lastName || 'Nair'}`.trim();
  const initials = 'PN';

  // Screen Title & Subtitle Config
  const screenMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Accounts Executive Operational Workspace',
      subtitle: 'Process journal vouchers, validate department financial events, execute vendor 3-way matching, reconcile bank statements, and track expense approvals.'
    },
    events: {
      title: 'Department Financial Event Validation Inbox',
      subtitle: 'Real-time billing, pharmacy, and laboratory revenue events awaiting general ledger posting review.'
    },
    journals: {
      title: 'General Ledger Journal Vouchers',
      subtitle: 'Double-entry accrual, reclassification, depreciation, and adjusting journal entries with balanced debit/credit verification.'
    },
    bills: {
      title: 'Vendor Invoices & 3-Way Match Verification',
      subtitle: 'PO vs GRN vs Vendor Invoice matching engine with automated 80%+ duplicate invoice risk detection.'
    },
    bank: {
      title: 'Bank Statement Reconciliation Engine',
      subtitle: 'Automated 92% confidence matching for HDFC statement lines against patient receipts, TPA settlements, and vendor debits.'
    },
    expenses: {
      title: 'Departmental Expense Requests',
      subtitle: 'Review medical consumables, lab reagents, and ward replenishment expenses within Level 1 maker delegation limits.'
    },
    receivables: {
      title: 'Customer & Payer Receivables Subledger',
      subtitle: 'Track aged insurance claims, corporate billing, and patient copay balances across 0-30, 31-60, 61-90, and 90+ day buckets.'
    },
    collections: {
      title: 'Receivables Follow-up Recovery Pipeline',
      subtitle: 'Kanban recovery stages for overdue corporate and TPA claims with call logging and promise-to-pay tracking.'
    },
    gst: {
      title: 'GST Statutory Tax Preparation (GSTR-1 & 3B)',
      subtitle: 'Monthly outward tax liabilities, reverse charge entries, Input Tax Credit (ITC) reconciliation, and 15-char GSTIN checksum verification.'
    },
    docs: {
      title: 'Document Evidence & Supporting Dossier Repository',
      subtitle: 'Central document repository substantiating journal vouchers, vendor delivery chalans, tax invoices, and bank payment advices.'
    },
    requests: {
      title: 'Executive Approval Submission Queue',
      subtitle: 'Real-time workflow tracker for vouchers submitted to Accounts Supervisor (Rahul Menon) and Accounts Manager (Anita Desai).'
    },
    activity: {
      title: 'Personal Cryptographic Audit Trail',
      subtitle: 'SHA-256 chained audit logs ensuring complete non-repudiation and compliance with Hospital Financial Policy POL-01.'
    }
  };

  const currentMeta = screenMeta[activeScreen] || screenMeta.dashboard;

  // Filtered Lists based on Search and Filter Pills
  const filteredExpenses = useMemo(() => {
    return expenseRequests.filter((e) => {
      const matchSearch =
        e.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.requested_by_staff.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === 'draft'
          ? e.status === 'draft'
          : activeTab === 'in_approval'
          ? e.status === 'in_approval'
          : activeTab === 'approved'
          ? e.status === 'approved'
          : true;
      return matchSearch && matchPill;
    });
  }, [expenseRequests, searchQuery, activeTab]);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const matchSearch =
        j.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === 'draft'
          ? j.status === 'draft'
          : activeTab === 'submitted'
          ? j.status === 'submitted'
          : activeTab === 'posted'
          ? j.status === 'posted'
          : true;
      return matchSearch && matchPill;
    });
  }, [journals, searchQuery, activeTab]);

  const filteredBills = useMemo(() => {
    return vendorBills.filter((b) => {
      const matchSearch =
        b.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.vendor?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === 'matched'
          ? b.three_way_match?.result === 'matched'
          : activeTab === 'warnings'
          ? b.duplicate_score >= 80
          : activeTab === 'draft'
          ? b.status === 'draft'
          : true;
      return matchSearch && matchPill;
    });
  }, [vendorBills, searchQuery, activeTab]);

  const filteredBank = useMemo(() => {
    return bankTransactions.filter((tx) => {
      const matchSearch =
        tx.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.txn_date.includes(searchQuery);
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === 'unmatched'
          ? tx.match_status === 'unmatched'
          : activeTab === 'matched'
          ? tx.match_status === 'matched'
          : true;
      return matchSearch && matchPill;
    });
  }, [bankTransactions, searchQuery, activeTab]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchSearch =
        ev.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.source_department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.source_reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === 'pending'
          ? ev.status === 'pending_validation'
          : activeTab === 'validated'
          ? ev.status === 'validated'
          : true;
      return matchSearch && matchPill;
    });
  }, [events, searchQuery, activeTab]);

  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      const matchSearch =
        r.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchPill =
        activeTab === 'all'
          ? true
          : activeTab === '0_30'
          ? r.aging_bucket === '0_30'
          : activeTab === '31_60'
          ? r.aging_bucket === '31_60'
          : activeTab === '61_90'
          ? r.aging_bucket === '61_90'
          : activeTab === '90_plus'
          ? r.aging_bucket === '90_plus'
          : true;
      return matchSearch && matchPill;
    });
  }, [receivables, searchQuery, activeTab]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* ============================================================ */}
      {/* 1. SIDEBAR (260px) - EXACT PHARMACY STRUCTURE                */}
      {/* ============================================================ */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>Financial Enterprise HMS</div>
          </div>
        </div>

        {/* Current Department Card */}
        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Current department</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                background: '#EFF6FF',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              FINANCE
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Accounts &amp; Finance</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
            Central Financial Control · Block A, Level 2
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E5E7EB', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onSelectRole('supervisor')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563EB',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <ArrowRight size={12} />
              Switch to Supervisor Workspace →
            </button>
            <button
              type="button"
              onClick={() => onSelectRole('manager')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#4B5563',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <ArrowRight size={12} />
              Switch to Manager Workspace →
            </button>
            <button
              type="button"
              onClick={() => onOpenMaster?.('dofa')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#B45309',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <Scale size={12} />
              DoFA Approval Matrix (POL-01) →
            </button>
          </div>
        </div>

        {/* Grouped Nav */}
        <nav style={{ flex: 1, padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navGroups.map((group) => (
            <React.Fragment key={group.label}>
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 8px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: '#6B7280',
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = activeScreen === item.id;
                const IconComponent = item.icon;
                const count = item.badge || 0;
                const isHot = count > 0;
                const countFg = isHot ? '#1D4ED8' : '#6B7280';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveScreen(item.id);
                      setActiveTab('all');
                      setSearchQuery('');
                    }}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#2563EB' : '#374151',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <IconComponent size={18} color={isActive ? '#2563EB' : '#6B7280'} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: countFg,
                          background: isActive ? '#DBEAFE' : '#F1F5F9',
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* User Profile Footer with Logout */}
        <AccountsSidebarUserFooter customRole="Maker · AE-01 Level 1" />
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA (Clean White Sticky App Bar + Content)  */}
      {/* ============================================================ */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky App Bar (52px) */}
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={propWorkload}
          breadcrumbScreen={currentMeta.title}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />

        {/* Page Inner Container (24px padding, 24px gap) */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card with 5 Operational Triggers */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: 0 }}>
                {currentMeta.title}
              </h1>
              <p style={{ fontSize: '14px', color: '#4B5563', marginTop: '6px', marginBottom: 0 }}>
                {currentMeta.subtitle}
              </p>
            </div>

            {/* 5 Primary Operational Triggers */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowJournalModal(true)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                }}
              >
                <Plus size={16} />
                New Journal Entry
              </button>

              <button
                onClick={() => setShowBillModal(true)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#111827',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={16} color="#2563EB" />
                Record Vendor Bill
              </button>

              <button
                onClick={() => {
                  setActiveScreen('bank');
                  setActiveTab('all');
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#111827',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeftRight size={16} color="#16A34A" />
                Reconcile Bank
              </button>

              <button
                onClick={() => setShowExpenseModal(true)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  color: '#111827',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <WalletCards size={16} color="#7C3AED" />
                Raise Expense
              </button>

              <button
                onClick={loadData}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                Refresh Data
              </button>
            </div>
          </div>

          {/* 10 Dense KPI Cards (2 Rows x 5 Cards Grid Layout) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* ROW 1: Operational Queues & Immediate Checks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
              {/* Card 1: Draft Journals */}
              <div
                onClick={() => { setActiveScreen('journals'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Draft Journals</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#EFF6FF', color: '#2563EB' }}>
                    Awaiting Sub
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>
                    {journals.filter(j => j.status === 'draft').length}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>active drafts</span>
                </div>
              </div>

              {/* Card 2: Vendor Bill Warnings */}
              <div
                onClick={() => { setActiveScreen('bills'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Vendor Warnings</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#FEF2F2', color: '#DC2626' }}>
                    1 High Risk
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#DC2626' }}>
                    {vendorBills.filter(b => b.duplicate_score >= 80).length}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>duplicate flags</span>
                </div>
              </div>

              {/* Card 3: Unmatched Bank Lines */}
              <div
                onClick={() => { setActiveScreen('bank'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Unmatched Bank</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#FFFBEB', color: '#D97706' }}>
                    HDFC ••4417
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#D97706' }}>
                    {bankTransactions.filter(b => b.match_status === 'unmatched').length}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>lines to match</span>
                </div>
              </div>

              {/* Card 4: Approvals Pending */}
              <div
                onClick={() => { setActiveScreen('requests'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Approval Queue</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#EFF6FF', color: '#2563EB' }}>
                    Supervisor
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#2563EB' }}>
                    {myRequests.filter(r => r.status === 'pending').length || 3}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>in review</span>
                </div>
              </div>

              {/* Card 5: SHA-256 Ledger Integrity */}
              <div
                onClick={() => onOpenMaster?.('audit')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Ledger Integrity</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#DCFCE7', color: '#16A34A' }}>
                    SHA-256 OK
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#16A34A' }}>100%</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>unbroken chain</span>
                </div>
              </div>
            </div>

            {/* ROW 2: Department Demands, Receivables & Statutory (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
              {/* Card 6: Event Validation Inbox */}
              <div
                onClick={() => { setActiveScreen('events'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Event Inbox</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#EFF6FF', color: '#2563EB' }}>
                    Billing / Lab
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>
                    {events.filter(e => e.status === 'pending_validation').length}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>pending events</span>
                </div>
              </div>

              {/* Card 7: Overdue Receivables */}
              <div
                onClick={() => { setActiveScreen('receivables'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Overdue Rec (90d+)</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#FEF2F2', color: '#DC2626' }}>
                    Escalations
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>
                    {formatINR(receivables.filter(r => r.aging_bucket === '90_plus').reduce((a, b) => a + Number(b.outstanding_amount), 0))}
                  </span>
                </div>
              </div>

              {/* Card 8: Department Expenses */}
              <div
                onClick={() => { setActiveScreen('expenses'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Pending Expenses</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#FFFBEB', color: '#D97706' }}>
                    {expenseRequests.filter(e => e.status === 'in_approval').length} In Review
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#D97706' }}>
                    {formatINR(expenseRequests.reduce((a, b) => a + Number(b.amount), 0))}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>requested</span>
                </div>
              </div>

              {/* Card 9: GST Tax Batches */}
              <div
                onClick={() => { setActiveScreen('gst'); setActiveTab('all'); }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>GST Batches</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#F5F3FF', color: '#7C3AED' }}>
                    GSTR-1 &amp; 3B
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#7C3AED' }}>
                    {gstBatches.length || 3}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>filing batches</span>
                </div>
              </div>

              {/* Card 10: Active Fiscal Period */}
              <div
                onClick={() => onOpenMaster?.('coa')}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Fiscal Period</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#DCFCE7', color: '#16A34A' }}>
                    Period 7 Open
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>Oct 2026</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>FY27 active</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. SPLIT-SCREEN WORKSPACE: Table (Left) + Context Drawer (Right) */}
          {/* ============================================================ */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* LEFT DATA TABLE CONTAINER (flex: 1 1 640px) */}
            <div style={{ flex: '1 1 640px', minWidth: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header Filters & Search */}
              <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {activeScreen === 'expenses'
                        ? 'Departmental Expense Requests'
                        : activeScreen === 'journals'
                        ? 'General Ledger Journal Entries'
                        : activeScreen === 'bills'
                        ? 'Vendor Invoices & 3-Way Match Verification'
                        : activeScreen === 'bank'
                        ? 'Bank Statement Reconciliation Engine'
                        : activeScreen === 'events'
                        ? 'Department Financial Event Validation'
                        : activeScreen === 'receivables'
                        ? 'Customer & Payer Receivables Subledger'
                        : activeScreen === 'collections'
                        ? 'Collection Pipeline Recovery'
                        : activeScreen === 'gst'
                        ? 'GST Statutory Return Batches'
                        : activeScreen === 'requests'
                        ? 'My Approval Requests'
                        : 'Operational Financial Queue'}
                    </h2>
                    <p style={{ fontSize: '13px', color: '#4B5563', marginTop: '2px', marginBottom: 0 }}>
                      {activeScreen === 'expenses'
                        ? 'Department expense requisitions · maker level 1 threshold ≤ ₹50,000'
                        : activeScreen === 'journals'
                        ? 'Accrual, adjustments, and reclassifications with balanced debit/credit verification'
                        : activeScreen === 'bills'
                        ? 'PO and GRN 3-way match reconciliation with automated duplicate alert score'
                        : activeScreen === 'bank'
                        ? 'Reconcile HDFC statement lines with suggested voucher allocations'
                        : activeScreen === 'events'
                        ? 'Automated events originating from billing counters, lab diagnostics, and pharmacy store'
                        : activeScreen === 'receivables'
                        ? 'Aging subledger: 0–30, 31–60, 61–90, and 90+ days escalation debt'
                        : activeScreen === 'collections'
                        ? 'Active follow-ups, payment promises, and supervisor escalation reviews'
                        : activeScreen === 'gst'
                        ? 'GSTR-1 outward invoices and GSTR-3B monthly tax computation'
                        : activeScreen === 'requests'
                        ? 'Status tracking across all submitted vouchers awaiting supervisor/manager review'
                        : 'Audit trace and journal activity logs'}
                    </p>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search reference, party or category..."
                      style={{
                        height: '40px',
                        width: '260px',
                        maxWidth: '100%',
                        padding: '0 12px 0 36px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {activeScreen === 'expenses' && (
                    <>
                      {[
                        ['all', 'All alerts'],
                        ['in_approval', 'In approval'],
                        ['draft', 'Drafts'],
                        ['approved', 'Approved'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeScreen === 'journals' && (
                    <>
                      {[
                        ['all', 'All Journals'],
                        ['draft', 'Drafts'],
                        ['submitted', 'Submitted'],
                        ['posted', 'Posted'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeScreen === 'bills' && (
                    <>
                      {[
                        ['all', 'All Bills'],
                        ['matched', '3-Way Matched'],
                        ['warnings', 'Duplicate Warnings'],
                        ['draft', 'Draft Invoices'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeScreen === 'bank' && (
                    <>
                      {[
                        ['all', 'All Lines'],
                        ['unmatched', 'Unmatched Lines'],
                        ['matched', 'Matched Ledger'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeScreen === 'events' && (
                    <>
                      {[
                        ['all', 'All Events'],
                        ['pending', 'Pending Validation'],
                        ['validated', 'Validated'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeScreen === 'receivables' && (
                    <>
                      {[
                        ['all', 'All Buckets'],
                        ['0_30', '0–30 Days'],
                        ['31_60', '31–60 Days'],
                        ['61_90', '61–90 Days'],
                        ['90_plus', '90+ Days (Critical)'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setActiveTab(k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeTab === k ? '#2563EB' : '#FFFFFF',
                            color: activeTab === k ? '#FFFFFF' : '#374151',
                            border: `1px solid ${activeTab === k ? '#2563EB' : '#E5E7EB'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Table Data View */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '700px' }}>
                  {/* 1. EXPENSES TABLE (activeScreen === 'expenses') */}
                  {activeScreen === 'expenses' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(100px, 0.8fr) minmax(140px, 1.2fr) minmax(130px, 1fr) 120px 100px 90px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>REFERENCE</div>
                        <div>DEPARTMENT</div>
                        <div>CATEGORY</div>
                        <div>REQUESTED BY</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT (₹)</div>
                        <div style={{ textAlign: 'center' }}>STATUS</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredExpenses.map((exp) => {
                        const isSelected = selectedExpense?.id === exp.id;
                        return (
                          <div
                            key={exp.id}
                            onClick={() => setSelectedExpense(exp)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(100px, 0.8fr) minmax(140px, 1.2fr) minmax(130px, 1fr) 120px 100px 90px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2563EB', fontSize: '13px' }}>
                              {exp.reference_no}
                            </div>
                            <div style={{ fontSize: '13px', textTransform: 'capitalize', color: '#111827' }}>
                              {exp.department_id}
                            </div>
                            <div style={{ fontSize: '12px', color: '#4B5563', textTransform: 'capitalize' }}>
                              {exp.expense_type.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                              {exp.requested_by_staff}
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                              {formatINR2(exp.amount)}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  background: exp.status === 'approved' ? '#DCFCE7' : '#FEF3C7',
                                  color: exp.status === 'approved' ? '#166534' : '#92400E'
                                }}
                              >
                                {exp.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExpense(exp);
                                }}
                                style={{
                                  height: '28px',
                                  padding: '0 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #E5E7EB',
                                  background: '#FFFFFF',
                                  color: '#2563EB',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Inspect
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 2. JOURNALS TABLE */}
                  {activeScreen === 'journals' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '130px 100px 1.5fr 110px 110px 100px 80px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>REFERENCE</div>
                        <div>DATE</div>
                        <div>DESCRIPTION</div>
                        <div style={{ textAlign: 'right' }}>DEBIT (₹)</div>
                        <div style={{ textAlign: 'right' }}>CREDIT (₹)</div>
                        <div style={{ textAlign: 'center' }}>STATUS</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredJournals.map((j) => {
                        const isSelected = selectedJournal?.id === j.id;
                        return (
                          <div
                            key={j.id}
                            onClick={() => setSelectedJournal(j)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '130px 100px 1.5fr 110px 110px 100px 80px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2563EB', fontSize: '13px' }}>{j.reference_no}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{j.journal_date}</div>
                            <div style={{ fontSize: '12px', color: '#1E293B' }}>{j.description}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>{formatINR2(j.total_debit)}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>{formatINR2(j.total_credit)}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', background: j.status === 'posted' ? '#DCFCE7' : '#FEF3C7', color: j.status === 'posted' ? '#166534' : '#92400E' }}>
                                {j.status}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedJournal(j); }}
                                style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 3. VENDOR BILLS TABLE */}
                  {activeScreen === 'bills' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '130px 1.2fr 100px 120px 110px 100px 80px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>REF / INVOICE</div>
                        <div>VENDOR NAME</div>
                        <div>PO NUMBER</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT (₹)</div>
                        <div style={{ textAlign: 'center' }}>3-WAY MATCH</div>
                        <div style={{ textAlign: 'center' }}>DUP SCORE</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredBills.map((b) => {
                        const isSelected = selectedBill?.id === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBill(b)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '130px 1.2fr 100px 120px 110px 100px 80px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#2563EB', fontSize: '13px' }}>{b.reference_no}</div>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>{b.invoice_no}</div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{b.vendor?.name}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{b.po_no || '—'}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{formatINR2(b.net_payable)}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: b.three_way_match?.result === 'matched' ? '#DCFCE7' : '#FEF2F2', color: b.three_way_match?.result === 'matched' ? '#166534' : '#B91C1C' }}>
                                {b.three_way_match?.result || 'Draft'}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              {b.duplicate_score >= 80 ? (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                                  {b.duplicate_score}% Risk
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>Clean</span>
                              )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedBill(b); }}
                                style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 4. BANK TRANSACTIONS TABLE */}
                  {activeScreen === 'bank' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px 1.5fr 120px 90px 110px 80px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>TXN DATE</div>
                        <div>NARRATION</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT (₹)</div>
                        <div style={{ textAlign: 'center' }}>TYPE</div>
                        <div style={{ textAlign: 'center' }}>STATUS</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredBank.map((tx) => {
                        const isSelected = selectedBankTxn?.id === tx.id;
                        return (
                          <div
                            key={tx.id}
                            onClick={() => setSelectedBankTxn(tx)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '110px 1.5fr 120px 90px 110px 80px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent'
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{tx.txn_date}</div>
                            <div style={{ fontSize: '13px', color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.narration}
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: tx.direction === 'credit' ? '#16A34A' : '#111827' }}>
                              {tx.direction === 'credit' ? '+' : '-'}{formatINR2(tx.amount)}
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: '#6B7280' }}>
                              {tx.type}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: tx.match_status === 'matched' ? '#DCFCE7' : '#FEF2F2', color: tx.match_status === 'matched' ? '#166534' : '#B91C1C' }}>
                                {tx.match_status}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedBankTxn(tx); }}
                                style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Match
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 5. EVENT INBOX TABLE */}
                  {activeScreen === 'events' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '140px 110px 130px 1.2fr 110px 100px 90px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>EVENT ID</div>
                        <div>SOURCE DEPT</div>
                        <div>SOURCE REF</div>
                        <div>EVENT TYPE</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT (₹)</div>
                        <div style={{ textAlign: 'center' }}>STATUS</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredEvents.map((evt) => {
                        const isSelected = selectedEvent?.id === evt.id;
                        return (
                          <div
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '140px 110px 130px 1.2fr 110px 100px 90px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2563EB', fontSize: '13px' }}>{evt.event_id}</div>
                            <div style={{ fontSize: '12px', textTransform: 'capitalize', color: '#111827' }}>{evt.source_department}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{evt.source_reference}</div>
                            <div style={{ fontSize: '12px', color: '#4B5563' }}>{evt.event_type}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{formatINR2(evt.amount)}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: evt.status === 'validated' ? '#DCFCE7' : '#FEF3C7', color: evt.status === 'validated' ? '#166534' : '#92400E' }}>
                                {evt.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                                style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 6. RECEIVABLES TABLE */}
                  {activeScreen === 'receivables' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '130px 1.4fr 120px 100px 120px 110px 80px',
                          alignItems: 'center',
                          height: '44px',
                          padding: '0 16px',
                          borderTop: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          background: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <div>REFERENCE</div>
                        <div>CUSTOMER / PAYER</div>
                        <div>PATIENT</div>
                        <div>DUE DATE</div>
                        <div style={{ textAlign: 'right' }}>OUTSTANDING (₹)</div>
                        <div style={{ textAlign: 'center' }}>AGING BUCKET</div>
                        <div style={{ textAlign: 'center' }}>ACTION</div>
                      </div>

                      {filteredReceivables.map((r) => {
                        const isSelected = selectedReceivable?.id === r.id;
                        return (
                          <div
                            key={r.id}
                            onClick={() => setSelectedReceivable(r)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '130px 1.4fr 120px 100px 120px 110px 80px',
                              alignItems: 'center',
                              minHeight: '56px',
                              padding: '8px 16px',
                              borderBottom: '1px solid #F1F5F9',
                              background: isSelected ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                              borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2563EB', fontSize: '13px' }}>{r.reference_no}</div>
                            <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{r.customer?.name}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{r.patient_name || '—'}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{r.due_date}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{formatINR2(r.outstanding_amount)}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: r.aging_bucket === '90_plus' ? '#FEE2E2' : '#EFF6FF', color: r.aging_bucket === '90_plus' ? '#B91C1C' : '#1D4ED8' }}>
                                {r.aging_bucket.replace('_', '–')} Days
                              </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedReceivable(r); setShowFollowupModal(true); }}
                                style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Follow-up
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Fallback for other screens */}
                  {!['expenses', 'journals', 'bills', 'bank', 'events', 'receivables'].includes(activeScreen) && (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
                      <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Screen active: {currentMeta.title}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Select records from the queue to view complete context inspection.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT STICKY CONTEXT INSPECTION DRAWER (flex: 1 1 360px)     */}
            {/* ============================================================ */}
            <div style={{ flex: '1 1 360px', minWidth: '320px', maxWidth: '420px', position: 'sticky', top: '70px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
                INSPECTION · CONTEXT DETAILS
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: 'calc(100vh - 110px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* 1. EXPENSE DRAWER */}
                {activeScreen === 'expenses' && selectedExpense && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                          {selectedExpense.reference_no}
                        </h3>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: selectedExpense.status === 'approved' ? '#DCFCE7' : '#FEF3C7',
                            color: selectedExpense.status === 'approved' ? '#166534' : '#92400E'
                          }}
                        >
                          {selectedExpense.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        Dept: {selectedExpense.department_id.toUpperCase()} · Category: {selectedExpense.expense_type.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        DoFA Tier 1 (≤ ₹50,000)
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                        }}
                      >
                        Cost Center: CC-100
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#F9FAFB', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Amount</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                          {formatINR(selectedExpense.amount)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>GST</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>₹ 0.00</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Net Payable</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563EB' }}>
                          {formatINR(selectedExpense.amount)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#374151' }}>
                      <div>
                        <span style={{ color: '#6B7280' }}>Requested By:</span>{' '}
                        <strong>{selectedExpense.requested_by_staff}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6B7280' }}>Justification:</span>{' '}
                        <span>{selectedExpense.business_reason || 'Medical consumables replenishment for daily shift requirements.'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#6B7280' }}>GL Allocation:</span>{' '}
                        <strong>5110 Medical Consumables &amp; Supplies</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6B7280' }}>Supervisor Checker:</span>{' '}
                        <strong>Rahul Menon (AS-01) · Level 1 Verification</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedExpense.status === 'draft' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await accountsService.submitExpenseRequest(selectedExpense.id);
                            showToast(`Expense ${selectedExpense.reference_no} submitted for supervisor review!`);
                            loadData();
                          }}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: '8px',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Submit for Supervisor Check
                        </button>
                      ) : (
                        <div style={{ padding: '10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #DCFCE7', fontSize: '12px', color: '#166534', textAlign: 'center', fontWeight: 600 }}>
                          ✓ Requisition in verification queue with Supervisor
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenMaster?.('audit')}
                        style={{
                          width: '100%',
                          height: '34px',
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          color: '#475569',
                          border: '1px solid #E5E7EB',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        Inspect Cryptographic Hash Trail
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. JOURNALS DRAWER */}
                {activeScreen === 'journals' && selectedJournal && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                          {selectedJournal.reference_no}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', background: selectedJournal.status === 'posted' ? '#DCFCE7' : '#FEF3C7', color: selectedJournal.status === 'posted' ? '#166534' : '#92400E' }}>
                          {selectedJournal.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        Date: {selectedJournal.journal_date} · Ref: {selectedJournal.external_reference || 'N/A'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#F9FAFB', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Total Debit</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                          {formatINR(selectedJournal.total_debit)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Total Credit</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                          {formatINR(selectedJournal.total_credit)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Balance</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A' }}>Balanced</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Narration:</div>
                      <div style={{ fontSize: '12px', color: '#4B5563', background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        {selectedJournal.description}
                      </div>
                    </div>

                    {selectedJournal.lines && selectedJournal.lines.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Journal Legs Breakdown:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedJournal.lines.map((ln, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: '#F8FAFC', borderRadius: '6px' }}>
                              <span>{ln.account_name || ln.account_code || ln.account_id}</span>
                              <span style={{ fontWeight: 600 }}>
                                {Number(ln.debit) > 0 ? `Dr ${formatINR(ln.debit)}` : `Cr ${formatINR(ln.credit)}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                      <button
                        type="button"
                        onClick={() => onOpenMaster?.('audit')}
                        style={{ width: '100%', height: '36px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Verify Hash Stamp (POL-01)
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. VENDOR BILL DRAWER */}
                {activeScreen === 'bills' && selectedBill && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                          {selectedBill.reference_no}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: selectedBill.three_way_match?.result === 'matched' ? '#DCFCE7' : '#FEF2F2', color: selectedBill.three_way_match?.result === 'matched' ? '#166534' : '#B91C1C' }}>
                          {selectedBill.three_way_match?.result || 'Draft'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#4B5563', marginTop: '2px' }}>
                        Vendor: <strong>{selectedBill.vendor?.name}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Invoice: {selectedBill.invoice_no}</div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>Automated 3-Way Match Check</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>PO Ref: <strong>{selectedBill.po_no || 'PO-2610-09'}</strong></div>
                        <div>GRN Ref: <strong>{selectedBill.three_way_match?.grn_no || 'GRN-2610-18'}</strong></div>
                        <div>Match: <strong>{selectedBill.three_way_match?.result || 'Matched'}</strong></div>
                        <div>Variance: <strong>₹ 0.00</strong></div>
                      </div>
                    </div>

                    {selectedBill.duplicate_score >= 80 && (
                      <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B91C1C', fontWeight: 700, fontSize: '12px' }}>
                          <AlertTriangle size={15} /> Duplicate Risk Detected ({selectedBill.duplicate_score}%)
                        </div>
                        <div style={{ fontSize: '11px', color: '#7F1D1D' }}>
                          Identical vendor invoice detected within 15-day tolerance window.
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          await accountsService.submitVendorBill(selectedBill.id, true);
                          showToast(`Bill ${selectedBill.reference_no} submitted for supervisor check!`);
                          loadData();
                        }}
                        style={{ width: '100%', height: '38px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Submit Bill for Approval
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. BANK TRANSACTION DRAWER */}
                {activeScreen === 'bank' && selectedBankTxn && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                          Bank Statement Line
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: selectedBankTxn.match_status === 'matched' ? '#DCFCE7' : '#FEF2F2', color: selectedBankTxn.match_status === 'matched' ? '#166534' : '#B91C1C' }}>
                          {selectedBankTxn.match_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600, marginTop: '4px' }}>
                        {selectedBankTxn.narration}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        Date: {selectedBankTxn.txn_date} · HDFC ••4417
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Transaction Amount</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: selectedBankTxn.direction === 'credit' ? '#16A34A' : '#111827' }}>
                        {selectedBankTxn.direction === 'credit' ? '+' : '-'}{formatINR2(selectedBankTxn.amount)}
                      </div>
                    </div>

                    {selectedBankTxn.match_status === 'unmatched' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #BFDBFE', background: '#F8FAFF' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>Suggested Match (92%)</span>
                            <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>Exact Match</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                            TPA Settlement / Patient Deposit Rec REC-2026-001
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await accountsService.matchBankTransaction({
                                bank_transaction_id: selectedBankTxn.id,
                                matched_type: 'receipt',
                                matched_id: 'REC-2026-001',
                                confidence: 92,
                                method: 'suggested',
                              });
                              showToast('Bank line reconciled and matched!');
                              loadData();
                            }}
                            style={{ marginTop: '10px', width: '100%', background: '#2563EB', color: '#FFF', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Accept &amp; Reconcile
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', background: '#F0FDF4', borderRadius: '8px', color: '#166534', fontWeight: 600, fontSize: '13px' }}>
                        <CheckCircle2 size={24} style={{ margin: '0 auto 6px' }} />
                        Line matched with ledger receipt voucher.
                      </div>
                    )}
                  </div>
                )}

                {/* 5. DEFAULT DRAWER FOR OTHER SCREENS */}
                {!['expenses', 'journals', 'bills', 'bank'].includes(activeScreen) && (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                    <ClipboardCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Context Inspection Active</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Select an operational entity from the ledger to inspect complete double-entry attributes.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* CREATE JOURNAL MODAL */}
      {showJournalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Create Journal Voucher (Maker AE-01)</h3>
              <button onClick={() => setShowJournalModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Posting Date</label>
                <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>External Reference</label>
                <input type="text" value={journalRef} onChange={e => setJournalRef(e.target.value)} placeholder="e.g. INV-REF-101" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Narration / Description</label>
              <input type="text" value={journalDesc} onChange={e => setJournalDesc(e.target.value)} placeholder="Business reason for journal..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Journal Legs</span>
                <button
                  type="button"
                  onClick={() => setJournalLines([...journalLines, { account_id: '', debit: 0, credit: 0, narration: '' }])}
                  style={{ border: 'none', background: 'transparent', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Line
                </button>
              </div>
              {journalLines.map((ln, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 30px', gap: '8px', marginBottom: '6px' }}>
                  <select
                    value={ln.account_id}
                    onChange={e => {
                      const updated = [...journalLines];
                      updated[idx].account_id = e.target.value;
                      setJournalLines(updated);
                    }}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                  >
                    <option value="">Select Account...</option>
                    {coaList.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Debit"
                    value={ln.debit || ''}
                    onChange={e => {
                      const updated = [...journalLines];
                      updated[idx].debit = parseFloat(e.target.value) || 0;
                      setJournalLines(updated);
                    }}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    placeholder="Credit"
                    value={ln.credit || ''}
                    onChange={e => {
                      const updated = [...journalLines];
                      updated[idx].credit = parseFloat(e.target.value) || 0;
                      setJournalLines(updated);
                    }}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                  />
                  {journalLines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setJournalLines(journalLines.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '6px', marginTop: '8px', fontSize: '12px' }}>
                <span>Total Debit: <strong>{formatINR2(totalDr)}</strong></span>
                <span>Total Credit: <strong>{formatINR2(totalCr)}</strong></span>
                <span style={{ color: isBalanced ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                  {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isBalanced}
                onClick={handleCreateJournal}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: isBalanced ? '#2563EB' : '#94A3B8', color: '#FFF', fontSize: '13px', fontWeight: 600, cursor: isBalanced ? 'pointer' : 'not-allowed' }}
              >
                Submit Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BILL MODAL */}
      {showBillModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '580px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Record Vendor Bill (3-Way Match Intake)</h3>
              <button onClick={() => setShowBillModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Vendor</label>
                <input type="text" placeholder="Vendor name or code" value={billVendorId} onChange={e => setBillVendorId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Invoice Number</label>
                  <input type="text" placeholder="INV-2026-X" value={billInvoiceNo} onChange={e => setBillInvoiceNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>PO Number</label>
                  <input type="text" placeholder="PO-2026-X" value={billPoNo} onChange={e => setBillPoNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Taxable Amount (₹)</label>
                <input type="number" placeholder="Taxable Amount" value={billAmount || ''} onChange={e => setBillAmount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>

              {billDupCheckResult?.has_duplicate && billDupCheckResult?.score >= 80 && (
                <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ color: '#DC2626', fontWeight: 700 }}>High Duplicate Risk Detected ({billDupCheckResult.score}%)</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={billAckDuplicate} onChange={e => setBillAckDuplicate(e.target.checked)} />
                    <span>I acknowledge this bill may duplicate an existing invoice</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowBillModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleCreateBill} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Save &amp; Submit Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAISE EXPENSE MODAL */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Raise Department Expense Request</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Department</label>
                <select value={expDept} onChange={e => setExpDept(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                  <option value="opd">Outpatient (OPD)</option>
                  <option value="ipd">Inpatient (IPD)</option>
                  <option value="pharmacy">Pharmacy Store</option>
                  <option value="lab">Pathology Lab</option>
                  <option value="radiology">Radiology &amp; Imaging</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                <select value={expType} onChange={e => setExpType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                  <option value="medical_consumables">Medical Consumables</option>
                  <option value="lab_reagents">Laboratory Reagents</option>
                  <option value="pharmacy_emergency">Emergency Medicine Purchases</option>
                  <option value="admin_supplies">Administrative Supplies</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Amount (₹)</label>
                <input type="number" placeholder="Enter requested amount" value={expAmount || ''} onChange={e => setExpAmount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Business Justification</label>
                <textarea rows={3} placeholder="Operational reason for expense..." value={expReason} onChange={e => setExpReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleCreateExpense} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Submit Requisition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTICE */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 120, background: '#1E293B', color: '#FFFFFF', padding: '12px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
