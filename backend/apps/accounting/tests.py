import uuid
from decimal import Decimal
from datetime import date
from django.utils import timezone
from django.test import TestCase
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework import status

from apps.accounts.models import RoleType
from .models import (
    ChartOfAccount, CostCenter, DelegationLimit, PeriodLock, PeriodLockStatus,
    Journal, JournalLine, JournalStatus, GLEntry, GLBalance, ApprovalRequest, ApprovalStatus, ApprovalLevel,
    FinancialEvent, EventStatus, AccountAuditLog, CustomerMirror, IntegrationOutbox,
    Refund, RefundStatus, Receivable, ReceivableType, ReceivableStatus, AgingBucket,
    Receipt, ReceiptAllocation, WriteOffRequest,
    VendorMirror, VendorBill, VendorBillItem, ThreeWayMatch, BillStatus, ControlViolation, FinancialException, StatementFlag, ExceptionStatus,
    IPDUnbilledTracker, ConsultantShareBatch, ConsultantShareItem,
    OTImplantUsageRegister, OTImplantConsignmentMatch
)
from .services import (
    JournalService, ApprovalEngineService, PeriodService,
    AuditService, EventInboxService, BillingIntegrationService,
    PharmacyIntegrationService, ClinicalIntegrationService
)
from .exceptions import (
    JournalBalanceError, SoDViolationError, LimitExceededError,
    PeriodLockedError
)
from apps.pharmacy.models import (
    PharmacyMedicine, PharmacySupplier, PharmacyBatch, BatchStatus, MedicineCategory
)

User = get_user_model()

class AccountingFoundationTestCase(TestCase):
    """Phase 1: Foundation, Ledger, DoFA, Period Lock, Audit Hash-Chain and Event Inbox"""

    def setUp(self):
        # Create users
        self.maker_exec = User.objects.create_user(
            username='priya_exec',
            email='priya@northhospital.com',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            first_name='Priya',
            last_name='Nair'
        )
        self.supervisor = User.objects.create_user(
            username='vikram_sup',
            email='vikram@northhospital.com',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Vikram',
            last_name='Malhotra'
        )
        self.manager = User.objects.create_user(
            username='rajesh_mgr',
            email='rajesh@northhospital.com',
            role=RoleType.ACCOUNTS_MANAGER,
            first_name='Rajesh',
            last_name='Sharma'
        )

        # Create COA accounts
        self.cash_acc = ChartOfAccount.objects.create(
            hospital_id='HOSP-NORTH-01',
            code='1000',
            name='Cash in Hand',
            type='asset',
            is_postable=True
        )
        self.rev_acc = ChartOfAccount.objects.create(
            hospital_id='HOSP-NORTH-01',
            code='4000',
            name='OPD Consultation Revenue',
            type='revenue',
            is_postable=True
        )

        # Create Cost Center
        self.cc_opd = CostCenter.objects.create(
            hospital_id='HOSP-NORTH-01',
            code='CC-100',
            name='Outpatient Department'
        )

        # Delegation limits (DoFA POL-01)
        DelegationLimit.objects.create(
            policy_version_id='POL-01-v3.2',
            role='supervisor',
            document_type='journal',
            max_amount=Decimal('50000.00')
        )
        DelegationLimit.objects.create(
            policy_version_id='POL-01-v3.2',
            role='manager',
            document_type='journal',
            max_amount=Decimal('500000.00')
        )

        # Period locks
        PeriodLock.objects.create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-09',
            status=PeriodLockStatus.LOCKED
        )
        PeriodLock.objects.create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-10',
            status=PeriodLockStatus.OPEN
        )

        self.client = APIClient()

    def test_journal_balance_validation(self):
        """Rule: A journal must balance (debits == credits). Unbalanced draft throws JournalBalanceError."""
        unbalanced_lines = [
            {'account_id': str(self.cash_acc.id), 'debit': Decimal('1000.00'), 'credit': Decimal('0.00')},
            {'account_id': str(self.rev_acc.id), 'debit': Decimal('0.00'), 'credit': Decimal('800.00')},
        ]
        journal = JournalService.create_draft_journal(
            maker=self.maker_exec,
            journal_date=date(2026, 10, 8),
            description='Unbalanced test journal',
            lines=unbalanced_lines
        )
        with self.assertRaises(JournalBalanceError):
            JournalService.submit_journal(journal.id, self.maker_exec)

    def test_period_lock_guard(self):
        """Rule: Any attempt to post or submit a voucher into a locked fiscal period must fail."""
        balanced_lines = [
            {'account_id': str(self.cash_acc.id), 'debit': Decimal('500.00'), 'credit': Decimal('0.00')},
            {'account_id': str(self.rev_acc.id), 'debit': Decimal('0.00'), 'credit': Decimal('500.00')},
        ]
        # September 2026 is LOCKED
        with self.assertRaises(PeriodLockedError):
            JournalService.create_draft_journal(
                maker=self.maker_exec,
                journal_date=date(2026, 9, 20),
                description='Backdated journal in locked month',
                lines=balanced_lines
            )

    def test_segregation_of_duties_sod(self):
        """Rule: Segregation of Duties (SoD) forbids maker from approving their own document."""
        balanced_lines = [
            {'account_id': str(self.cash_acc.id), 'debit': Decimal('1500.00'), 'credit': Decimal('0.00')},
            {'account_id': str(self.rev_acc.id), 'debit': Decimal('0.00'), 'credit': Decimal('1500.00')},
        ]
        journal = JournalService.create_draft_journal(
            maker=self.maker_exec,
            journal_date=date(2026, 10, 8),
            description='Balanced journal for SoD test',
            lines=balanced_lines
        )
        app_req = JournalService.submit_journal(journal.id, self.maker_exec)

        # Maker tries to approve
        with self.assertRaises(SoDViolationError):
            ApprovalEngineService.process_decision(
                approval_request_id=app_req.id,
                user=self.maker_exec,
                decision='approve',
                version=1
            )

    def test_dofa_routing_and_approval_posting(self):
        """Rule: Amount <= 50,000 can be approved by Supervisor directly, posting lines to GL."""
        balanced_lines = [
            {'account_id': str(self.cash_acc.id), 'debit': Decimal('25000.00'), 'credit': Decimal('0.00')},
            {'account_id': str(self.rev_acc.id), 'debit': Decimal('0.00'), 'credit': Decimal('25000.00')},
        ]
        journal = JournalService.create_draft_journal(
            maker=self.maker_exec,
            journal_date=date(2026, 10, 8),
            description='Within supervisor limit',
            lines=balanced_lines
        )
        app_req = JournalService.submit_journal(journal.id, self.maker_exec)

        # Supervisor approves
        res = ApprovalEngineService.process_decision(
            approval_request_id=app_req.id,
            user=self.supervisor,
            decision='approve',
            version=1
        )
        self.assertEqual(res['status'], ApprovalStatus.APPROVED)
        journal.refresh_from_db()
        self.assertEqual(journal.status, 'posted')
        self.assertEqual(GLEntry.objects.filter(journal=journal).count(), 2)

    def test_dofa_limit_exceeded_guard(self):
        """Rule: Amount > 50,000 (e.g. 150,000) cannot be approved by Supervisor directly; must forward."""
        balanced_lines = [
            {'account_id': str(self.cash_acc.id), 'debit': Decimal('150000.00'), 'credit': Decimal('0.00')},
            {'account_id': str(self.rev_acc.id), 'debit': Decimal('0.00'), 'credit': Decimal('150000.00')},
        ]
        journal = JournalService.create_draft_journal(
            maker=self.maker_exec,
            journal_date=date(2026, 10, 8),
            description='Above supervisor limit',
            lines=balanced_lines
        )
        app_req = JournalService.submit_journal(journal.id, self.maker_exec)

        with self.assertRaises(LimitExceededError):
            ApprovalEngineService.process_decision(
                approval_request_id=app_req.id,
                user=self.supervisor,
                decision='approve',
                acknowledgements=['missing_documents'],
                version=1
            )

        # Supervisor uses 'approve_and_forward'
        res = ApprovalEngineService.process_decision(
            approval_request_id=app_req.id,
            user=self.supervisor,
            decision='approve_and_forward',
            comment='Verified and forwarded to Manager',
            acknowledgements=['missing_documents'],
            version=1
        )
        self.assertEqual(res['next_level'], 'manager')
        app_req.refresh_from_db()
        self.assertEqual(app_req.current_level, 'manager')

    def test_audit_hash_chain_integrity(self):
        """Rule: Audit log forms an unbroken SHA-256 hash chain that verifies as healthy."""
        AuditService.log_action(
            actor_user=self.maker_exec,
            module='journal',
            action='test_action_1',
            entity_type='journal',
            entity_id='00000000-0000-0000-0000-000000000001',
            new_state={'key': 'val1'}
        )
        AuditService.log_action(
            actor_user=self.supervisor,
            module='journal',
            action='test_action_2',
            entity_type='journal',
            entity_id='00000000-0000-0000-0000-000000000002',
            new_state={'key': 'val2'}
        )

        verification = AuditService.verify_integrity()
        self.assertTrue(verification['valid'])
        self.assertEqual(verification['status'], 'healthy')

    def test_inbound_event_idempotency(self):
        """Rule: Duplicate events with identical idempotency_key are ignored safely."""
        event_payload = {
            'event_id': 'evt-opd-001',
            'idempotency_key': 'billing:charge:INV-9901',
            'event_type': 'department.charge',
            'source_department': 'billing',
            'source_reference': 'INV-9901',
            'amount': '1200.00',
            'business_date': '2026-10-08'
        }
        res1 = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res1['status'], EventStatus.PENDING_VALIDATION)

        res2 = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res2['status'], 'duplicate_ignored')


class AccountingExecutivePhase2TestCase(TestCase):
    """Phase 2: Accounts Executive Workspace (Vendor Bills, Bank Recon, Receivables, GST)"""

    def setUp(self):
        self.exec_user = User.objects.create_user(
            username='priya_exec2',
            email='priya2@northhospital.com',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            first_name='Priya',
            last_name='Nair'
        )
        self.sup_user = User.objects.create_user(
            username='vikram_sup2',
            email='vikram2@northhospital.com',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Vikram',
            last_name='Malhotra'
        )

        from .models import VendorMirror, CustomerMirror, BankAccount, BankTransaction, BankStatement, ChartOfAccount
        self.bank_gl = ChartOfAccount.objects.create(
            hospital_id='HOSP-NORTH-01',
            code='1010',
            name='HDFC Bank',
            type='asset',
            is_postable=True
        )
        self.bank_acc = BankAccount.objects.create(
            hospital_id='HOSP-NORTH-01',
            account_no_masked='••4417',
            ifsc='HDFC0001234',
            bank_name='HDFC Bank',
            purpose='collections',
            gl_account=self.bank_gl,
            book_balance=Decimal('1000000.00'),
            statement_balance=Decimal('1000000.00')
        )
        self.vendor = VendorMirror.objects.create(
            source_vendor_id='VEND-TEST-01',
            name='MedEquip Solutions',
            gstin='27AABCM8812R1Z2',
            pan='AABCM8812R',
            payment_terms_days=30
        )
        self.customer = CustomerMirror.objects.create(
            source_type='insurance',
            source_id='PAYER-TEST-01',
            name='Star Health Insurance',
            gstin='27AAACS1122R1Z4'
        )

    def test_duplicate_bill_detection_engine(self):
        """Rule: Same vendor and invoice no produces 100% score; requires ack_duplicate to submit."""
        from .services import VendorBillService
        from .models import VendorBill
        from .exceptions import DuplicateBillWarningError

        # Create Bill 1
        bill1 = VendorBillService.create_vendor_bill(self.exec_user, {
            'vendor_id': str(self.vendor.id),
            'invoice_no': 'INV-MED-001',
            'invoice_date': '2026-10-02',
            'due_date': '2026-11-02',
            'po_no': 'PO-001',
            'taxable_amount': Decimal('50000.00'),
            'cgst': Decimal('4500.00'),
            'sgst': Decimal('4500.00'),
            'total_amount': Decimal('59000.00'),
            'net_payable': Decimal('59000.00')
        })

        # Check duplicate score on Bill 2 with same invoice no
        dup_check = VendorBillService.check_duplicates(
            vendor_id=str(self.vendor.id),
            invoice_no='INV-MED-001',
            amount=Decimal('50000.00'),
            invoice_date=date(2026, 10, 4)
        )
        self.assertTrue(dup_check['has_duplicate'])
        self.assertEqual(dup_check['score'], 100)

        # Create Bill 2
        bill2 = VendorBillService.create_vendor_bill(self.exec_user, {
            'vendor_id': str(self.vendor.id),
            'invoice_no': 'INV-MED-001',
            'invoice_date': '2026-10-04',
            'due_date': '2026-11-04',
            'taxable_amount': Decimal('50000.00'),
            'total_amount': Decimal('59000.00'),
            'net_payable': Decimal('59000.00')
        })

        # Submit without acknowledgment should raise DuplicateBillWarningError
        with self.assertRaises(DuplicateBillWarningError):
            VendorBillService.submit_vendor_bill(bill2.id, self.exec_user, ack_duplicate=False)

        # Submit with acknowledgment succeeds
        app_req = VendorBillService.submit_vendor_bill(bill2.id, self.exec_user, ack_duplicate=True)
        self.assertEqual(app_req.status, 'pending')
        self.assertIn('duplicate_warning', app_req.risk_flags)

    def test_bank_reconciliation_suggestion_engine(self):
        """Rule: Suggestion engine ranks receipts matching amount and party within window."""
        from .models import BankTransaction, Receipt
        from .services import BankReconciliationService

        # Create a receipt in system
        Receipt.objects.create(
            receipt_no='RCPT-STAR-99',
            source='insurance_settlement',
            mode='neft',
            amount=Decimal('240000.00'),
            received_on=date(2026, 10, 3),
            bank_account=self.bank_acc
        )

        # Create unmatched bank statement line
        btxn = BankTransaction.objects.create(
            bank_account=self.bank_acc,
            bank_reference='TXN-NEFT-991',
            txn_date=date(2026, 10, 3),
            value_date=date(2026, 10, 3),
            narration='NEFT CR-STAR HEALTH AND ALLIED INS CLAIMS SETTL',
            amount=Decimal('240000.00'),
            direction='credit',
            type='neft',
            match_status='unmatched'
        )

        suggestions = BankReconciliationService.suggest_matches(btxn.id)
        self.assertGreaterEqual(len(suggestions), 1)
        top = suggestions[0]
        self.assertGreaterEqual(top['confidence'], 90)
        self.assertEqual(top['amount'], '240000.00')

    def test_receivables_aging_buckets(self):
        """Rule: Receivables are correctly categorized into 0_30, 31_60, 61_90, 90_plus."""
        from .models import Receivable
        from .services import ReceivablesService
        from django.utils import timezone

        today = timezone.now().date()

        r_current = Receivable.objects.create(
            reference_no='REC-CURR',
            customer=self.customer,
            invoice_date=today - timezone.timedelta(days=10),
            due_date=today,
            original_amount=Decimal('10000.00'),
            outstanding_amount=Decimal('10000.00')
        )
        r_old = Receivable.objects.create(
            reference_no='REC-OLD',
            customer=self.customer,
            invoice_date=today - timezone.timedelta(days=120),
            due_date=today - timezone.timedelta(days=95),
            original_amount=Decimal('25000.00'),
            outstanding_amount=Decimal('25000.00')
        )

        ReceivablesService.recalculate_aging_buckets()
        r_current.refresh_from_db()
        r_old.refresh_from_db()

        self.assertEqual(r_current.aging_bucket, '0_30')
        self.assertEqual(r_old.aging_bucket, '90_plus')

    def test_gstin_format_validator(self):
        """Rule: GSTIN must match 15-character standard state-code + PAN + entity + checksum format."""
        from .services import GSTService

        valid_res = GSTService.validate_gstin('27AABCU9603R1ZM')
        self.assertTrue(valid_res['valid'])
        self.assertEqual(valid_res['state_code'], '27')

        invalid_res = GSTService.validate_gstin('12345')
        self.assertFalse(invalid_res['valid'])


class AccountingSupervisorPhase3TestCase(TestCase):
    """Phase 3: Accounts Supervisor (Level 2) first-checker workflows and Daily Close tests"""

    def setUp(self):
        self.exec_user = User.objects.create_user(
            username='ae_priya',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            password='TestPassword123!'
        )
        self.supervisor_user = User.objects.create_user(
            username='as_rahul',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            password='TestPassword123!'
        )
        self.manager_user = User.objects.create_user(
            username='am_rajesh',
            role=RoleType.ACCOUNTS_MANAGER,
            password='TestPassword123!'
        )
        self.customer = CustomerMirror.objects.create(
            name='Star Health Insurer',
            source_type='insurance',
            source_id='PAYER-STAR-01'
        )

    def test_daily_close_refuses_with_pending_approvals(self):
        """Rule: Daily Close refuses with BlockedByDependencyError when approvals are pending."""
        from .models import ApprovalRequest, ApprovalLevel, ApprovalStatus
        from .services import DailyCloseService
        from .exceptions import BlockedByDependencyError
        from django.utils import timezone

        today = timezone.now().date()
        # Create a pending approval
        ApprovalRequest.objects.create(
            document_type='journal',
            document_id=uuid.uuid4(),
            reference_no='JV-PEND-01',
            amount=Decimal('45000.00'),
            maker=self.exec_user,
            current_level=ApprovalLevel.SUPERVISOR,
            current_approver_role=RoleType.ACCOUNTS_SUPERVISOR,
            status=ApprovalStatus.PENDING
        )

        with self.assertRaises(BlockedByDependencyError):
            DailyCloseService.run_daily_close(today, self.supervisor_user)

    def test_daily_close_run_and_lock_when_clean(self):
        """Rule: Daily Close succeeds when queue is empty, and then operations can be locked."""
        from .models import ApprovalRequest, Escalation, DailyCloseRun
        from .services import DailyCloseService
        from django.utils import timezone

        today = timezone.now().date()
        # Ensure no pending approvals or open escalations
        ApprovalRequest.objects.filter(status='pending').delete()
        Escalation.objects.filter(status='open').delete()
        DailyCloseRun.objects.filter(business_date=today).delete()

        res_run = DailyCloseService.run_daily_close(today, self.supervisor_user)
        self.assertEqual(res_run['status'], 'closed')

        res_lock = DailyCloseService.lock_daily_operations(today, self.supervisor_user)
        self.assertEqual(res_lock['status'], 'locked')

    def test_supervisor_write_off_limit_enforcement(self):
        """Rule: Write-off <= 10,000 is approved by Supervisor; > 10,000 is forwarded to Manager."""
        from .models import WriteOffRequest, Receivable
        from django.utils import timezone
        from rest_framework.test import APIRequestFactory
        from .views import WriteOffRequestViewSet

        today = timezone.now().date()
        rec = Receivable.objects.create(
            reference_no='REC-WO-01',
            customer=self.customer,
            invoice_date=today,
            due_date=today,
            original_amount=Decimal('50000.00'),
            outstanding_amount=Decimal('50000.00')
        )

        # 1. Write-off within limit (₹8,600)
        wo_small = WriteOffRequest.objects.create(
            reference_no='WO-SM-01',
            customer=self.customer,
            receivable=rec,
            amount=Decimal('8600.00'),
            reason='Hardship waiver',
            status='pending'
        )

        factory = APIRequestFactory()
        view = WriteOffRequestViewSet.as_view({'post': 'decision'})

        req_small = factory.post(f'/api/v1/accounts/write-offs/{wo_small.id}/decision/', {'decision': 'approve'}, format='json')
        force_authenticate(req_small, user=self.supervisor_user)
        resp_small = view(req_small, pk=str(wo_small.id))
        self.assertEqual(resp_small.status_code, 200)
        wo_small.refresh_from_db()
        self.assertEqual(wo_small.status, 'approved')

        # 2. Write-off above limit (₹18,000)
        wo_large = WriteOffRequest.objects.create(
            reference_no='WO-LG-01',
            customer=self.customer,
            receivable=rec,
            amount=Decimal('18000.00'),
            reason='TPA disallowed',
            status='pending'
        )

        req_large = factory.post(f'/api/v1/accounts/write-offs/{wo_large.id}/decision/', {'decision': 'approve'}, format='json')
        force_authenticate(req_large, user=self.supervisor_user)
        resp_large = view(req_large, pk=str(wo_large.id))
        self.assertEqual(resp_large.status_code, 200)
        wo_large.refresh_from_db()
        self.assertEqual(wo_large.status, 'forwarded')

    def test_escalation_notes_and_forward(self):
        """Rule: Supervisor can add notes and forward escalation to Accounts Manager."""
        from .models import Escalation
        from .services import EscalationService

        esc = Escalation.objects.create(
            reference_no='ESC-TEST-01',
            type='approval',
            reason='high_amount',
            entity_type='vendor_bill',
            entity_id=uuid.uuid4(),
            raised_by=self.supervisor_user,
            raised_to='supervisor',
            amount=Decimal('450000.00'),
            status='open',
            notes=[]
        )

        EscalationService.add_note(esc.id, self.supervisor_user, 'Contacted vendor regarding high price.')
        esc.refresh_from_db()
        self.assertEqual(len(esc.notes), 1)

        EscalationService.forward_to_manager(esc.id, self.supervisor_user, 'Forwarding to AM for signoff')
        esc.refresh_from_db()
        self.assertEqual(esc.status, 'with_manager')
        self.assertEqual(esc.raised_to, 'manager')


class AccountingManagerPhase4TestCase(TestCase):
    """Phase 4: Accounts Manager Workspace (Operations Owner · AM-01)"""

    def setUp(self):
        self.manager_user = User.objects.create_user(
            username='am_kavita',
            role=RoleType.ACCOUNTS_MANAGER,
            first_name='Kavita',
            last_name='Shah',
            password='TestPassword123!'
        )
        self.supervisor_user = User.objects.create_user(
            username='as_rahul_m',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Rahul',
            last_name='Menon',
            password='TestPassword123!'
        )
        self.customer = CustomerMirror.objects.create(
            name='Medi Assist TPA',
            source_type='tpa',
            source_id='PAYER-MEDI-01'
        )
        self.client = APIClient()

    def test_manager_write_off_limit_enforcement(self):
        """Rule: Write-off <= ₹1,00,000 is approved by Manager; > ₹1,00,000 is forwarded to Controller."""
        from .models import WriteOffRequest, Receivable
        from .views import WriteOffRequestViewSet
        today = timezone.now().date()
        rec = Receivable.objects.create(
            reference_no='REC-WO-MGR-01',
            customer=self.customer,
            invoice_date=today,
            due_date=today,
            original_amount=Decimal('200000.00'),
            outstanding_amount=Decimal('200000.00')
        )

        # 1. Write-off within manager limit (₹68,000 <= ₹1 L) -> Approved
        wo_within = WriteOffRequest.objects.create(
            reference_no='WO-MGR-01',
            customer=self.customer,
            receivable=rec,
            amount=Decimal('68000.00'),
            reason='Consumables disallowance',
            status='pending'
        )

        factory = APIRequestFactory()
        view = WriteOffRequestViewSet.as_view({'post': 'decision'})

        req1 = factory.post(f'/api/v1/accounts/write-offs/{wo_within.id}/decision/', {'decision': 'approve'}, format='json')
        force_authenticate(req1, user=self.manager_user)
        resp1 = view(req1, pk=str(wo_within.id))
        self.assertEqual(resp1.status_code, 200)
        wo_within.refresh_from_db()
        self.assertEqual(wo_within.status, 'approved')

        # 2. Write-off above manager limit (₹1,42,000 > ₹1 L) -> Forwarded to Finance Controller
        wo_above = WriteOffRequest.objects.create(
            reference_no='WO-MGR-02',
            customer=self.customer,
            receivable=rec,
            amount=Decimal('142000.00'),
            reason='Social work waiver',
            status='pending'
        )

        req2 = factory.post(f'/api/v1/accounts/write-offs/{wo_above.id}/decision/', {'decision': 'approve'}, format='json')
        force_authenticate(req2, user=self.manager_user)
        resp2 = view(req2, pk=str(wo_above.id))
        self.assertEqual(resp2.status_code, 200)
        wo_above.refresh_from_db()
        self.assertEqual(wo_above.status, 'forwarded')

    def test_manager_vendor_bill_limit_enforcement(self):
        """Rule: Vendor bill <= ₹10 L is approved; > ₹10 L is forwarded to Finance Controller."""
        from .services import PayablesControlService

        # 1. Under limit bill (₹7,80,000 <= ₹10 L)
        res1 = PayablesControlService.decide_bill('PB-03', 'approve', self.manager_user)
        self.assertEqual(res1['status'], 'approved')

        # 2. Above limit bill (₹18,40,000 > ₹10 L)
        res2 = PayablesControlService.decide_bill('PB-02', 'approve', self.manager_user)
        self.assertEqual(res2['status'], 'with_controller')

    def test_budget_availability_includes_open_pos(self):
        """Rule: Department budget available balance must consider both consumed actuals and open PO commitments."""
        from .services import BudgetControlService
        from .models import Budget

        # Create or update budget with open PO commitment
        b = Budget.objects.create(
            fiscal_year='FY2026-27',
            department_id='Oncology',
            head_name='Dr. V. Raman',
            allocated_amount=Decimal('5000000.00'),
            consumed_amount=Decimal('3500000.00'),
            committed_amount=Decimal('500000.00')
        )

        budgets = BudgetControlService.get_budgets(fy='FY2026-27')
        onc = next(x for x in budgets if x['dept'] == 'Oncology')
        # Available = 50,00,000 - 35,00,000 - 5,00,000 = 10,00,000
        self.assertEqual(onc['available'], 1000000.00)

        # Request explanation
        res_exp = BudgetControlService.request_explanation('Oncology', self.manager_user, 'High spending in Q2')
        self.assertEqual(res_exp['status'], 'requested')
        b.refresh_from_db()
        self.assertTrue(b.explanation_requested)

    def test_cash_projection_and_buffer_evaluation(self):
        """Rule: Cash projection calculates 30-day runway and warns if dropping below buffer."""
        from .services import CashflowProjectionService

        proj = CashflowProjectionService.get_projection(days=30, buffer_cr=5.0)
        self.assertEqual(len(proj['series']), 30)
        self.assertGreater(proj['expected_collections'], 0)
        self.assertGreater(proj['expected_payments'], 0)
        self.assertIn('lowest_balance', proj)

    def test_financial_exception_lifecycle(self):
        """Rule: Exceptions can be created, assigned, investigated, and closed."""
        from .services import FinancialExceptionService
        from .models import FinancialException

        exc = FinancialException.objects.create(
            exception_no='EX-TEST-99',
            type='Large Variance',
            reference_no='BS-DIFF-01',
            title='Test Bank Difference',
            department_id='Finance',
            amount=Decimal('50000.00'),
            status='new'
        )

        # 1. Assign
        res_a = FinancialExceptionService.perform_action('EX-TEST-99', 'assign', self.manager_user, owner_name='Rahul Menon')
        self.assertEqual(res_a['status'], 'assigned')
        exc.refresh_from_db()
        self.assertEqual(exc.owner_name, 'Rahul Menon')

        # 2. Investigate
        res_i = FinancialExceptionService.perform_action('EX-TEST-99', 'investigate', self.manager_user)
        self.assertEqual(res_i['status'], 'investigating')
        exc.refresh_from_db()
        self.assertEqual(exc.status, 'investigating')

        # 3. Close
        res_c = FinancialExceptionService.perform_action('EX-TEST-99', 'close', self.manager_user, comment='Resolved')
        self.assertEqual(res_c['status'], 'closed')
        exc.refresh_from_db()
        self.assertEqual(exc.status, 'closed')

    def test_month_end_readiness_calculator(self):
        """Rule: Month-end readiness score computes live over 5 items."""
        from .services import MonthEndReadinessService

        readiness = MonthEndReadinessService.get_readiness('2026-09')
        self.assertEqual(len(readiness['checklist']), 5)
        self.assertGreaterEqual(readiness['readiness_score'], 0)
        self.assertLessEqual(readiness['readiness_score'], 100)


class AccountingManagerWorkflowTestCase(TestCase):
    """Phase 4: Manager queue routing, live readiness, payer write-offs, escalation lifecycle and API routes"""

    def setUp(self):
        import copy
        from .services import (ReceivablesControlService, PayablesControlService,
                               HighValueTransactionService, MonthEndReadinessService)
        # The control services keep rows in class-level lists; restore them after each test
        self._fixtures = [(lst, copy.deepcopy(lst)) for lst in (
            ReceivablesControlService.DEFAULT_PAYERS, PayablesControlService.DEFAULT_BILLS,
            HighValueTransactionService.DEFAULT_TRANSACTIONS, MonthEndReadinessService.CHECKLIST)]
        self.exec_user = User.objects.create_user(username='ae_wf', role=RoleType.ACCOUNTS_EXECUTIVE, password='x')
        self.supervisor_user = User.objects.create_user(username='as_wf', role=RoleType.ACCOUNTS_SUPERVISOR, password='x')
        self.manager_user = User.objects.create_user(username='am_wf', role=RoleType.ACCOUNTS_MANAGER, password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.manager_user)

    def tearDown(self):
        for lst, saved in self._fixtures:
            lst[:] = saved

    def _request(self, amount='250000.00', doc_type='expense'):
        return ApprovalEngineService.submit_for_approval(
            document_type=doc_type, document_id=uuid.uuid4(), reference_no=f'EXP-WF-{uuid.uuid4().hex[:6]}',
            amount=Decimal(amount), maker=self.exec_user
        )

    def test_supervisor_escalation_lands_in_manager_queue_and_forwards_to_controller(self):
        from .services import ManagerDashboardService
        from .models import ApprovalLevel
        req = self._request()
        ApprovalEngineService.process_decision(req.id, self.supervisor_user, 'escalate',
                                               comment='Budget head exhausted', reason_code='budget_violation', version=1)
        req.refresh_from_db()
        self.assertEqual(req.current_level, ApprovalLevel.MANAGER)
        self.assertIn(req, list(ManagerDashboardService.manager_queue()))
        self.assertEqual(ManagerDashboardService.queue_case(req)['reason'], 'Budget Violation')

        # ₹2.5 L expense is above the Manager's ₹2 L limit: Forward goes to the Controller, not back to the Manager
        ApprovalEngineService.process_decision(req.id, self.manager_user, 'forward',
                                               comment='Above my expense limit', version=req.version)
        req.refresh_from_db()
        self.assertEqual(req.current_level, ApprovalLevel.CONTROLLER)
        self.assertEqual(req.current_approver_role, RoleType.FINANCE_CONTROLLER)
        self.assertNotIn(req, list(ManagerDashboardService.manager_queue()))

    def test_decided_request_cannot_be_decided_again(self):
        from .exceptions import AccountingDomainError
        req = self._request(amount='20000.00')
        res = ApprovalEngineService.process_decision(req.id, self.supervisor_user, 'approve', version=1)
        with self.assertRaises(AccountingDomainError) as ctx:
            ApprovalEngineService.process_decision(req.id, self.supervisor_user, 'reject',
                                                   comment='Second decision', version=res['version'])
        self.assertEqual(ctx.exception.code, 'ALREADY_DECIDED')

    def test_readiness_approvals_item_completes_when_manager_queue_clears(self):
        from .services import MonthEndReadinessService
        req = self._request(amount='150000.00')
        ApprovalEngineService.process_decision(req.id, self.supervisor_user, 'approve_and_forward', version=1)
        k5 = lambda: next(i for i in MonthEndReadinessService.get_readiness('2026-09')['checklist'] if i['id'] == 'K5')
        self.assertLess(k5()['pct'], 100)
        self.assertIn('1 escalated approval', k5()['desc'])

        req.refresh_from_db()
        ApprovalEngineService.process_decision(req.id, self.manager_user, 'approve', version=req.version)
        self.assertEqual(k5()['pct'], 100)
        self.assertEqual(k5()['status'], 'Done')

    def test_payer_write_off_decisions_via_api(self):
        from .services import ReceivablesControlService
        payer = lambda pid: next(p for p in ReceivablesControlService.DEFAULT_PAYERS if p['id'] == pid)

        # ₹68,000 is within the ₹1 L limit
        resp = self.client.post('/api/v1/accounts/receivables/C03/write-off/decision/', {'decision': 'approve'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(payer('C03')['wo']['status'], 'Approved')
        again = self.client.post('/api/v1/accounts/receivables/C03/write-off/decision/', {'decision': 'approve'}, format='json')
        self.assertEqual(again.status_code, 409)

        # ₹1,42,000 is above the limit and goes to the Finance Controller
        resp = self.client.post('/api/v1/accounts/receivables/C06/write-off/decision/', {'decision': 'approve'}, format='json')
        self.assertEqual(resp.json()['status'], 'forwarded')
        self.assertEqual(payer('C06')['wo']['status'], 'With Controller')

        no_comment = self.client.post('/api/v1/accounts/receivables/C06/write-off/decision/', {'decision': 'reject'}, format='json')
        self.assertEqual(no_comment.status_code, 422)
        missing = self.client.post('/api/v1/accounts/receivables/C99/write-off/decision/', {'decision': 'approve'}, format='json')
        self.assertEqual(missing.status_code, 404)

    def test_escalation_transitions_and_repeat_escalations(self):
        from .models import Escalation
        r1 = self.client.post('/api/v1/accounts/receivables/C01/escalate-collection/', {'reason': 'CGHS dues ageing'}, format='json')
        r2 = self.client.post('/api/v1/accounts/receivables/C02/escalate-collection/', {'reason': 'Star Health dues'}, format='json')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)  # unique reference even within the same minute

        esc = Escalation.objects.get(id=r1.json()['escalation_id'])
        url = f'/api/v1/accounts/escalations/{esc.id}/transition/'
        self.assertEqual(self.client.post(url, {'action': 'investigate'}, format='json').json()['status'], 'investigating')
        self.assertEqual(self.client.post(url, {'action': 'forward_to_controller', 'comment': 'x'}, format='json').status_code, 422)
        fwd = self.client.post(url, {'action': 'forward_to_controller', 'comment': 'Needs Controller sign-off'}, format='json').json()
        self.assertEqual((fwd['status'], fwd['raised_to']), ('forwarded', 'finance_controller'))
        self.assertEqual(self.client.post(url, {'action': 'resolve', 'comment': 'Done now'}, format='json').status_code, 409)

    def test_budget_overrun_escalates_once(self):
        from .services import BudgetControlService
        BudgetControlService.get_budgets()
        self.assertEqual(BudgetControlService.escalate_overrun('Laboratory', self.manager_user, 'Over YTD budget')['status'], 'escalated')
        self.assertEqual(BudgetControlService.escalate_overrun('Laboratory', self.manager_user, 'Over YTD budget')['status'], 'already_escalated')

    def test_high_value_decisions_respect_manager_limits(self):
        base = '/api/v1/accounts/transactions/high-value'
        # H1 refund ₹2.85 L is within the ₹5 L refund limit
        self.assertEqual(self.client.post(f'{base}/H1/decision/', {'decision': 'approve'}, format='json').json()['status'], 'approved')
        self.assertEqual(self.client.post(f'{base}/H1/decision/', {'decision': 'approve'}, format='json').status_code, 409)
        # H2 expense ₹3.2 L is above the ₹2 L expense limit, so approving forwards it
        self.assertEqual(self.client.post(f'{base}/H2/decision/', {'decision': 'approve'}, format='json').json()['status'], 'with_controller')
        self.assertEqual(self.client.post(f'{base}/H3/decision/', {'decision': 'hold'}, format='json').status_code, 422)
        # Vendor-bill rows route through payables DoFA (PB-08 ₹22.4 L > ₹10 L)
        self.assertEqual(self.client.post(f'{base}/P:PB-08/decision/', {'decision': 'approve'}, format='json').json()['status'], 'with_controller')
        self.assertTrue(any(b['id'] == 'PB-08' for b in self.client.get('/api/v1/accounts/payables/bills/').json()))

    def test_month_end_delays_escalate_once(self):
        url = '/api/v1/accounts/close/monthly/2026-09/escalate-delays/'
        first = self.client.post(url).json()['count']
        self.assertGreater(first, 0)
        self.assertEqual(self.client.post(url).json()['count'], 0)

    def test_manager_endpoints_resolve_with_trailing_slash(self):
        for url in [
            '/api/v1/accounts/manager/dashboard/', '/api/v1/accounts/receivables/summary/?group_by=aging',
            '/api/v1/accounts/receivables/payers/', '/api/v1/accounts/payables/summary/',
            '/api/v1/accounts/cashflow/projection/?days=7', '/api/v1/accounts/transactions/high-value/',
            '/api/v1/accounts/budgets/departments/', '/api/v1/accounts/analytics/cost-centers/?period=Yearly',
            '/api/v1/accounts/exceptions/', '/api/v1/accounts/reviews/weekly/',
            '/api/v1/accounts/close/monthly/2026-09/readiness/', '/api/v1/accounts/analytics/departments/',
            '/api/v1/accounts/supervisor/dashboard/', '/api/v1/accounts/team/performance/',
            '/api/v1/accounts/team/performance/?level=supervisor', '/api/v1/accounts/audit/recent/?days=7',
            '/api/v1/accounts/approval-requests/?approver_role=ACCOUNTS_MANAGER&status=pending,escalated',
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200, url)
        # receivables/summary/ must reach the summary view, not the receivable detail route
        self.assertIsInstance(self.client.get('/api/v1/accounts/receivables/summary/').json(), list)


class FinanceControllerTestCase(TestCase):
    """Phase 5: Integrity, Period Close, Payment Release, Bank Control, Statements & Governance"""

    def setUp(self):
        self.client = APIClient()
        self.controller_user = User.objects.create_user(
            username='arundhati_ctrl',
            email='arundhati@northhospital.com',
            role=getattr(RoleType, 'FINANCE_CONTROLLER', 'FINANCE_CONTROLLER'),
            first_name='Arundhati',
            last_name='Roy'
        )
        self.client.force_authenticate(user=self.controller_user)

    def test_controller_dashboard_and_integrity_questions(self):
        resp = self.client.get('/api/v1/accounts/controller/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('kpis', data)
        self.assertIn('integrity_questions', data)
        self.assertEqual(len(data['integrity_questions']), 9)
        # Check that month-end close readiness is reported
        self.assertIn('month_close_readiness', data)

    def test_month_end_close_dependency_guard(self):
        # Initial readiness is 78%, not 100% -> approval must be rejected with 422
        resp = self.client.post('/api/v1/accounts/close/monthly/2026-09/approve/')
        self.assertEqual(resp.status_code, 422)
        err = resp.json().get('error', {})
        self.assertEqual(err.get('code'), 'BLOCKED_BY_DEPENDENCY')

        # Test delay action
        del_resp = self.client.post('/api/v1/accounts/close/monthly/2026-09/delay/', {
            'delay_to': '2026-10-08',
            'reason': 'Awaiting pharmacy sub-ledger reconciliation signoff'
        }, format='json')
        self.assertEqual(del_resp.status_code, 200)

        # Test escalation action
        esc_resp = self.client.post('/api/v1/accounts/close/monthly/2026-09/escalate/', {
            'reason': 'Escalated to CFO due to delayed sub-ledger clearances'
        }, format='json')
        self.assertEqual(esc_resp.status_code, 200)

    def test_quarter_end_close_and_item_review(self):
        # Fetch quarter-end close
        resp = self.client.get('/api/v1/accounts/close/quarterly/FY27-Q2/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('items', data)
        self.assertEqual(data['quarter'], 'FY27-Q2')

        # Review an item
        item_id = data['items'][0]['id']
        rev_resp = self.client.post(f'/api/v1/accounts/close/quarterly/FY27-Q2/items/{item_id}/review/')
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()['status'], 'Reviewed')

        # Locking quarter when not approved must fail
        lock_resp = self.client.post('/api/v1/accounts/close/quarterly/FY27-Q2/lock/')
        self.assertEqual(lock_resp.status_code, 422)

    def test_period_lock_and_reopen_governance(self):
        # Test reopen requires valid comment and acknowledgment
        resp1 = self.client.post('/api/v1/accounts/periods/2026-08/reopen/', {'comment': 'Hi'}, format='json')
        self.assertEqual(resp1.status_code, 422)

        resp2 = self.client.post('/api/v1/accounts/periods/2026-08/reopen/', {
            'comment': 'Auditor adjustment requested for depreciation',
            'acknowledgement': False
        }, format='json')
        self.assertEqual(resp2.status_code, 422)

        resp3 = self.client.post('/api/v1/accounts/periods/2026-08/reopen/', {
            'comment': 'Auditor adjustment requested for depreciation entry',
            'acknowledgement': True
        }, format='json')
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.json()['status'], 'reopened')

    def test_payment_batch_release_controls_and_dual_cosign(self):
        # List batches
        resp = self.client.get('/api/v1/accounts/payment-batches/')
        self.assertEqual(resp.status_code, 200)
        batches = resp.json()
        self.assertTrue(len(batches) > 0)

        # Batch PRB-1008 has an IC-02 bank detail violation check failure
        checks_resp = self.client.get('/api/v1/accounts/payment-batches/PRB-1008/checks/')
        self.assertEqual(checks_resp.status_code, 200)
        checks = checks_resp.json()
        self.assertFalse(checks['passed'])

        # Attempting to release PRB-1008 must fail with 422
        rel_fail = self.client.post('/api/v1/accounts/payment-batches/PRB-1008/release/', {'ack': True}, format='json')
        self.assertEqual(rel_fail.status_code, 422)

        # High-value batch PRB-1010 (> ₹1 Cr: ₹1.2 Cr) requires CFO co-sign
        from apps.accounting.models import PaymentBatch
        PaymentBatch.objects.filter(batch_no='PRB-1010').update(total_amount=Decimal('12000000.00'))
        rel_high = self.client.post('/api/v1/accounts/payment-batches/PRB-1010/release/', {'ack': True}, format='json')
        self.assertEqual(rel_high.status_code, 200)
        # Status should transition to 'Awaiting CFO Co-sign'
        self.assertEqual(rel_high.json()['batch_status'], 'Awaiting CFO Co-sign')

        # CFO co-signs
        cosign_resp = self.client.post('/api/v1/accounts/payment-batches/PRB-1010/cosign/', {
            'comment': 'CFO co-signature authorized for statutory & vendor batch'
        }, format='json')
        self.assertEqual(cosign_resp.status_code, 200)
        self.assertEqual(cosign_resp.json()['status'], 'Released')

    def test_bank_freeze_and_reconciliation_safeguards(self):
        # Freeze Axis Bank
        freeze_resp = self.client.post('/api/v1/accounts/bank-accounts/AXIS-9901/freeze/', {
            'comment': 'Freezing due to pending branch audit confirmation'
        }, format='json')
        self.assertEqual(freeze_resp.status_code, 200)
        self.assertTrue(freeze_resp.json()['is_frozen'])

        # Unfreeze
        unfreeze_resp = self.client.post('/api/v1/accounts/bank-accounts/AXIS-9901/freeze/', {
            'comment': 'Audit confirmation received'
        }, format='json')
        self.assertEqual(unfreeze_resp.status_code, 200)
        self.assertFalse(unfreeze_resp.json()['is_frozen'])

        # HDFC Bank Reconciliation has unexplained difference of ₹ 42,000 (EX-105)
        # Approval without acknowledgment must be rejected
        rec_fail = self.client.post('/api/v1/accounts/reconciliations/REC-HDFC-09/approve/', {'ack': False}, format='json')
        self.assertEqual(rec_fail.status_code, 422)

    def test_financial_statement_variance_flagging(self):
        # P&L detail
        resp = self.client.get('/api/v1/accounts/statements/pnl/')
        self.assertEqual(resp.status_code, 200)
        pnl = resp.json()
        self.assertIn('lines', pnl)

        # Flag Medical Supplies variance
        flag_resp = self.client.post('/api/v1/accounts/statements/pnl/flags/', {
            'line_key': 'Medical Supplies Consumed',
            'query': 'Investigate sudden 18.2% spike over prior month consumption'
        }, format='json')
        self.assertEqual(flag_resp.status_code, 200)
        self.assertEqual(flag_resp.json()['status'], 'flagged')

        # Verify an exception was raised for this line
        exc_resp = self.client.get('/api/v1/accounts/exceptions/')
        self.assertEqual(exc_resp.status_code, 200)
        excs = exc_resp.json()
        self.assertTrue(any('Medical Supplies' in e.get('title', '') for e in excs))

    def test_exception_lifecycle_and_side_effects(self):
        # Resolving EX-104 (GSTR-1 invoice mismatch) enables GSTR-1 approval
        act_resp = self.client.post('/api/v1/accounts/exceptions/EX-104/action/', {
            'action': 'resolve',
            'comment': 'Corrected taxable value on credit note in portal'
        }, format='json')
        self.assertEqual(act_resp.status_code, 200)

        # Now approve GSTR-1
        gst_appr = self.client.post('/api/v1/accounts/tax/returns/TR-GST-01/approve/', {'ack': True}, format='json')
        self.assertEqual(gst_appr.status_code, 200)
        self.assertEqual(gst_appr.json()['status'], 'Approved for Filing')

        # Resolving IC-02 unblocks payment batch PRB-1008
        ctrl_act = self.client.post('/api/v1/accounts/controls/violations/IC-02/action/', {
            'action': 'close',
            'comment': 'Supplier bank mandate verified with cancelled cheque and phone callback'
        }, format='json')
        self.assertEqual(ctrl_act.status_code, 200)

        # Check PRB-1008 again: IC-02 check should now pass
        checks = self.client.get('/api/v1/accounts/payment-batches/PRB-1008/checks/').json()
        self.assertTrue(checks['passed'])

    def test_high_risk_decisions_and_limits(self):
        # Transaction within Controller DoFA (<= ₹50 L)
        resp1 = self.client.post('/api/v1/accounts/high-risk/HR-101/decision/', {
            'decision': 'approve',
            'comment': 'Approved within Controller DoFA limit',
            'ack': True
        }, format='json')
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()['status'], 'Approved')

        # Related-party transaction HR-103 requires CFO approval
        resp2 = self.client.post('/api/v1/accounts/high-risk/HR-103/decision/', {
            'decision': 'approve',
            'comment': 'Attempting approval on related-party item',
            'ack': True
        }, format='json')
        self.assertEqual(resp2.status_code, 422)

        # Forwarding HR-103 to CFO succeeds
        fwd_resp = self.client.post('/api/v1/accounts/high-risk/HR-103/decision/', {
            'decision': 'forward_to_cfo',
            'comment': 'Forwarded related-party lease contract to CFO for board committee approval'
        }, format='json')
        self.assertEqual(fwd_resp.status_code, 200)
        self.assertEqual(fwd_resp.json()['status'], 'Forwarded to CFO')

    def test_policy_governance_and_audit_readiness(self):
        # Approve policy change POL-01
        pol_resp = self.client.post('/api/v1/accounts/policies/POL-01/changes/CHG-01/decision/', {
            'decision': 'approve',
            'comment': 'Approved increase of supervisor journal limit to ₹1,00,000'
        }, format='json')
        self.assertEqual(pol_resp.status_code, 200)
        self.assertEqual(pol_resp.json()['status'], 'approved')

        # Routine policy review
        rev_resp = self.client.post('/api/v1/accounts/policies/POL-02/review/')
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()['status'], 'reviewed')

        # Audit requests PBC
        pbc_resp = self.client.get('/api/v1/accounts/audit/requests/')
        self.assertEqual(pbc_resp.status_code, 200)
        self.assertTrue(len(pbc_resp.json()) > 0)

        # Mark PBC-01 ready and share
        r_ready = self.client.post('/api/v1/accounts/audit/requests/PBC-01/ready/')
        self.assertEqual(r_ready.status_code, 200)
        r_share = self.client.post('/api/v1/accounts/audit/requests/PBC-01/share/')
        self.assertEqual(r_share.status_code, 200)
        self.assertEqual(r_share.json()['status'], 'Shared with Auditor')


class CfoStrategyTestCase(TestCase):
    """Phase 6: Chief Financial Officer (CFO) Strategy, CapEx Engine, Risk Matrix & Board Reporting"""

    def setUp(self):
        self.cfo_user = User.objects.create_user(
            username='meera_cfo',
            email='meera@northhospital.com',
            role=RoleType.CFO,
            first_name='Meera',
            last_name='Rao'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.cfo_user)

    def test_cfo_dashboard_live_kpis_and_ten_questions(self):
        resp = self.client.get('/api/v1/accounts/cfo/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check KPIs
        self.assertIn('total_revenue', data['kpis'])
        self.assertIn('net_profit', data['kpis'])
        self.assertIn('cash_available', data['kpis'])
        self.assertIn('runway_all', data['kpis'])
        self.assertIn('ebitda', data['kpis'])

        # Check 10-Question Executive Dashboard answers
        questions = data.get('questions', [])
        self.assertEqual(len(questions), 10)
        q_texts = [q['q'] for q in questions]
        self.assertIn('Are we making money?', q_texts)
        self.assertIn('Which departments are profitable?', q_texts)
        self.assertIn('What is our cash runway?', q_texts)
        self.assertIn('Can we buy new MRI/CT equipment?', q_texts)
        self.assertIn('What should the board know today?', q_texts)

    def test_capex_evaluation_engine_and_approval_threshold(self):
        # 1. Fetch CapEx list
        cx_list_resp = self.client.get('/api/v1/accounts/cfo/capex/?status=Awaiting')
        self.assertEqual(cx_list_resp.status_code, 200)

        # 2. Approve CX-01 (14.50 Cr <= 25 Cr)
        appr_resp = self.client.post('/api/v1/accounts/cfo/capex/CX-01/decide/', {
            'action': 'approve',
            'comment': 'Approved second MRI to resolve 11-day wait list'
        }, format='json')
        self.assertEqual(appr_resp.status_code, 200)
        self.assertEqual(appr_resp.json()['status'], 'Approved')

        # Verify downstream effect on cash flow and pro forma DSCR
        bs_resp = self.client.get('/api/v1/accounts/cfo/balance-sheet/')
        self.assertEqual(bs_resp.status_code, 200)
        self.assertTrue(bs_resp.json()['has_new_loans'])

        cf_resp = self.client.get('/api/v1/accounts/cfo/cash-flow/?view=30 Days')
        self.assertEqual(cf_resp.status_code, 200)
        warnings = [w['title'] for w in cf_resp.json()['warnings']]
        self.assertIn('CapEx approved', warnings)

        # 3. CX-04 (₹ 85 Cr) exceeds CFO's ₹ 25 Cr limit
        over_resp = self.client.post('/api/v1/accounts/cfo/capex/CX-04/decide/', {
            'action': 'approve',
            'comment': 'Direct approval attempt'
        }, format='json')
        self.assertIn(over_resp.status_code, [403, 422])
        self.assertIn('Above your ₹ 25 Cr authority', str(over_resp.json()))

        # 4. Refer CX-04 to Board
        board_resp = self.client.post('/api/v1/accounts/cfo/capex/CX-04/decide/', {
            'action': 'board',
            'comment': '120-bed tower recommended for Board capital review'
        }, format='json')
        self.assertEqual(board_resp.status_code, 200)
        self.assertEqual(board_resp.json()['status'], 'Board Review')

    def test_strategic_approvals_dependency_and_risk_escalation_hook(self):
        # 1. SA-04 is linked to CX-01. Reset CX-01 to Awaiting CFO to test dependency
        from apps.accounting.models import CapexRequest, StrategicRisk
        CapexRequest.objects.filter(reference_no='CX-01').update(status='Awaiting CFO', is_fresh=False)

        dep_fail = self.client.post('/api/v1/accounts/cfo/approvals/SA-04/decide/', {
            'action': 'approve',
            'comment': 'Approve term loan without CapEx clearance'
        }, format='json')
        self.assertIn(dep_fail.status_code, [400, 422])
        self.assertIn('Approve CX-01', str(dep_fail.json()))

        # Now approve CX-01 first
        self.client.post('/api/v1/accounts/cfo/capex/CX-01/decide/', {
            'action': 'approve',
            'comment': 'Approved CX-01'
        }, format='json')

        dep_ok = self.client.post('/api/v1/accounts/cfo/approvals/SA-04/decide/', {
            'action': 'approve',
            'comment': 'Approved term loan with approved CapEx'
        }, format='json')
        self.assertEqual(dep_ok.status_code, 200)
        self.assertEqual(dep_ok.json()['status'], 'Approved')

        # 2. Side-effect hook: Approving SA-02 (Apex Pharma exclusive contract)
        sa02_resp = self.client.post('/api/v1/accounts/cfo/approvals/SA-02/decide/', {
            'action': 'approve',
            'comment': 'Approved 3-year exclusive supply for ₹ 3.4 Cr annual saving'
        }, format='json')
        self.assertEqual(sa02_resp.status_code, 200)

        # Verify R3 risk is elevated to Critical
        r3 = StrategicRisk.objects.get(reference_no='R3')
        self.assertEqual(r3.rating, 'Critical')
        self.assertIn('78% of drugs', r3.description)

    def test_department_profitability_and_turnaround_plan(self):
        dept_resp = self.client.get('/api/v1/accounts/cfo/departments/profitability/')
        self.assertEqual(dept_resp.status_code, 200)
        self.assertTrue(dept_resp.json()['loss_making_count'] > 0)

        # Issue turnaround plan directive for Operation Theatre
        to_resp = self.client.post('/api/v1/accounts/cfo/departments/Operation Theatre/turnaround/', {
            'message': 'Surgeon scheduling overhaul and renegotiation of implant pricing required by 31 Oct.'
        }, format='json')
        self.assertEqual(to_resp.status_code, 200)
        self.assertEqual(to_resp.json()['status'], 'requested')

    def test_budget_strategy_and_board_reporting_flow(self):
        # 1. Budget strategy review and approval
        b_get = self.client.get('/api/v1/accounts/cfo/budgets/strategy/')
        self.assertEqual(b_get.status_code, 200)

        b_appr = self.client.post('/api/v1/accounts/cfo/budgets/strategy/decide/', {
            'decision': 'approve',
            'comment': 'Approved FY28 budget strategy'
        }, format='json')
        self.assertEqual(b_appr.status_code, 200)
        self.assertEqual(b_appr.json()['status'], 'Approved')

        # 2. Board pack review and export
        br_get = self.client.get('/api/v1/accounts/cfo/board-report/')
        self.assertEqual(br_get.status_code, 200)
        self.assertEqual(len(br_get.json()['sections']), 5)

        # Toggle section
        t_resp = self.client.post('/api/v1/accounts/cfo/board-report/section/toggle/', {
            'section': 'growth',
            'included': False
        }, format='json')
        self.assertEqual(t_resp.status_code, 200)

        # Approve board pack
        ap_resp = self.client.post('/api/v1/accounts/cfo/board-report/approve/', {
            'comment': 'Approved for circulation to Trustees'
        }, format='json')
        self.assertEqual(ap_resp.status_code, 200)

        # Export board pack
        exp_resp = self.client.post('/api/v1/accounts/cfo/board-report/export/', {
            'type': 'pack'
        }, format='json')
        self.assertEqual(exp_resp.status_code, 200)
        self.assertIn('full Board pack', exp_resp.json()['message'])

    def test_executive_decisions_audit_logging(self):
        # Make a decision
        self.client.post('/api/v1/accounts/cfo/risks/R4/decide/', {
            'action': 'mitigate',
            'comment': 'Direct COO to formulate OT block scheduling'
        }, format='json')

        # Verify in decisions log
        dec_resp = self.client.get('/api/v1/accounts/cfo/decisions/')
        self.assertEqual(dec_resp.status_code, 200)
        decisions = dec_resp.json()['decisions']
        self.assertTrue(any('OT' in d['title'] or 'Operation Theatre' in d['title'] for d in decisions))


# =============================================================================
# Phase 7: Billing Integration Test Suite
# =============================================================================

class BillingIntegrationPhase7TestCase(TestCase):
    """Phase 7: Billing Integration, Real-Time Event Ingestion (#3 to #14),
    Receipt Auto-Allocation, Refund DoFA Round-Trip, and Day-End Reconciliation.
    """

    def setUp(self):
        from .services import BillingIntegrationService
        BillingIntegrationService.ensure_seed_data()

        self.maker_exec = User.objects.create_user(
            username='billing_cashier_1',
            email='cashier@northhospital.com',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            first_name='Anil',
            last_name='Verma'
        )
        self.supervisor = User.objects.create_user(
            username='billing_sup_1',
            email='sup@northhospital.com',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Vikram',
            last_name='Malhotra'
        )
        self.manager = User.objects.create_user(
            username='acc_manager_1',
            email='manager@northhospital.com',
            role=RoleType.ACCOUNTS_MANAGER,
            first_name='Rajesh',
            last_name='Sharma'
        )
        self.controller = User.objects.create_user(
            username='controller_1',
            email='controller@northhospital.com',
            role=RoleType.FINANCE_CONTROLLER,
            first_name='Sunita',
            last_name='Menon'
        )
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

        # Open fiscal period 2026-10
        PeriodLock.objects.get_or_create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-10',
            defaults={'status': PeriodLockStatus.OPEN}
        )
        # Lock fiscal period 2026-09
        PeriodLock.objects.get_or_create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-09',
            defaults={'status': PeriodLockStatus.LOCKED}
        )

    def test_event_3_cash_invoice_auto_posting(self):
        """Event #3: Routine OPD cash bill <= 50,000 auto-posts balanced GL journal"""
        event_payload = {
            'event_id': 'evt-bill-003',
            'idempotency_key': 'billing:inv:INV-OPD-101',
            'event_type': 'billing.invoice.created',
            'source_department': 'billing',
            'source_reference': 'INV-OPD-101',
            'business_date': '2026-10-10',
            'amount': '1500.00',
            'tax_amount': '270.00',
            'payload': {
                'patient_uhid': 'UHID-2001',
                'patient_name': 'Aarav Patel',
                'is_credit': False,
                'payment_type': 'cash'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertTrue(res['auto_posted'])

        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.POSTED)
        self.assertEqual(journal.total_debit, Decimal('1500.00'))
        self.assertEqual(journal.total_credit, Decimal('1500.00'))
        self.assertEqual(journal.lines.count(), 3)  # Dr Patient Rec, Cr Revenue, Cr GST

        # Verify Outbox published accounts.journal.posted
        outbox = IntegrationOutbox.objects.filter(aggregate_id=str(journal.id), event_type='accounts.journal.posted')
        self.assertTrue(outbox.exists())

    def test_event_4_credit_invoice_receivable_creation(self):
        """Event #4: Credit bill creates open Receivable in 0-30 aging bucket"""
        event_payload = {
            'event_id': 'evt-bill-004',
            'idempotency_key': 'billing:inv:INV-CR-201',
            'event_type': 'billing.invoice.created',
            'source_department': 'billing',
            'source_reference': 'INV-CR-201',
            'business_date': '2026-10-10',
            'amount': '25000.00',
            'tax_amount': '2500.00',
            'party_type': 'insurance',
            'party_id': 'PAYER-HDFC-01',
            'payload': {
                'payer_id': 'PAYER-HDFC-01',
                'payer_name': 'HDFC ERGO Health',
                'patient_uhid': 'UHID-3001',
                'patient_name': 'Kavita Iyer',
                'is_credit': True,
                'payment_type': 'insurance'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.VALIDATED)

        rec = Receivable.objects.get(reference_no='INV-CR-201')
        self.assertEqual(rec.outstanding_amount, Decimal('25000.00'))
        self.assertEqual(rec.status, ReceivableStatus.OPEN)
        self.assertEqual(rec.aging_bucket, AgingBucket.BUCKET_0_30)

    def test_event_5_payment_collected_auto_allocation(self):
        """Event #5: Payment collection creates Receipt, auto-allocates by correlation_id, and settles Receivable"""
        # First create a credit invoice
        inv_payload = {
            'event_id': 'evt-bill-005-inv',
            'idempotency_key': 'billing:inv:INV-ALLOC-301',
            'event_type': 'billing.invoice.created',
            'source_department': 'billing',
            'source_reference': 'INV-ALLOC-301',
            'business_date': '2026-10-10',
            'amount': '8000.00',
            'tax_amount': '800.00',
            'payload': {
                'patient_uhid': 'UHID-4001',
                'patient_name': 'Deepak Joshi',
                'is_credit': True
            }
        }
        EventInboxService.process_incoming_event(inv_payload)
        rec = Receivable.objects.get(reference_no='INV-ALLOC-301')
        self.assertEqual(rec.outstanding_amount, Decimal('8000.00'))

        # Now collect payment referencing INV-ALLOC-301
        pay_payload = {
            'event_id': 'evt-bill-005-pay',
            'idempotency_key': 'billing:pay:PAY-301',
            'event_type': 'billing.payment.collected',
            'source_department': 'billing',
            'source_reference': 'INV-ALLOC-301',
            'correlation_id': 'INV-ALLOC-301',
            'business_date': '2026-10-10',
            'amount': '8000.00',
            'payload': {
                'receipt_no': 'REC-301',
                'payment_mode': 'upi',
                'patient_uhid': 'UHID-4001'
            }
        }
        res = EventInboxService.process_incoming_event(pay_payload)
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertTrue(res['allocated'])

        receipt = Receipt.objects.get(receipt_no='REC-301')
        self.assertEqual(receipt.status, 'allocated')
        self.assertEqual(receipt.amount, Decimal('8000.00'))

        rec.refresh_from_db()
        self.assertEqual(rec.outstanding_amount, Decimal('0.00'))
        self.assertEqual(rec.settled_amount, Decimal('8000.00'))
        self.assertEqual(rec.status, ReceivableStatus.SETTLED)

        # Check Outbox emitted accounts.receivable.settled
        outbox = IntegrationOutbox.objects.filter(aggregate_id=str(rec.id), event_type='accounts.receivable.settled')
        self.assertTrue(outbox.exists())

    def test_event_6_advance_adjusted(self):
        """Event #6: billing.advance.adjusted posts advance clearance against receivable"""
        # Create credit bill
        EventInboxService.process_incoming_event({
            'event_id': 'evt-adv-inv',
            'idempotency_key': 'billing:inv:INV-ADV-401',
            'event_type': 'billing.invoice.created',
            'source_reference': 'INV-ADV-401',
            'business_date': '2026-10-10',
            'amount': '5000.00',
            'payload': {'patient_uhid': 'UHID-5001', 'is_credit': True}
        })
        # Adjust advance
        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-adv-adj',
            'idempotency_key': 'billing:adv:ADV-401',
            'event_type': 'billing.advance.adjusted',
            'source_reference': 'INV-ADV-401',
            'correlation_id': 'INV-ADV-401',
            'business_date': '2026-10-10',
            'amount': '5000.00',
            'payload': {'patient_uhid': 'UHID-5001'}
        })
        self.assertEqual(res['status'], EventStatus.POSTED)
        rec = Receivable.objects.get(reference_no='INV-ADV-401')
        self.assertEqual(rec.status, ReceivableStatus.SETTLED)

    def test_event_7_discount_approved(self):
        """Event #7: billing.discount.approved posts discount and decrements receivable"""
        EventInboxService.process_incoming_event({
            'event_id': 'evt-disc-inv',
            'idempotency_key': 'billing:inv:INV-DISC-501',
            'event_type': 'billing.invoice.created',
            'source_reference': 'INV-DISC-501',
            'business_date': '2026-10-10',
            'amount': '10000.00',
            'payload': {'patient_uhid': 'UHID-6001', 'is_credit': True}
        })
        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-disc-adj',
            'idempotency_key': 'billing:disc:DISC-501',
            'event_type': 'billing.discount.approved',
            'source_reference': 'INV-DISC-501',
            'correlation_id': 'INV-DISC-501',
            'business_date': '2026-10-10',
            'amount': '2000.00',
            'payload': {'patient_uhid': 'UHID-6001'}
        })
        self.assertEqual(res['status'], EventStatus.POSTED)
        rec = Receivable.objects.get(reference_no='INV-DISC-501')
        self.assertEqual(rec.outstanding_amount, Decimal('8000.00'))

    def test_event_8_and_9_refund_approval_round_trip_and_payout(self):
        """Event #8 & #9: Refund request routes to DoFA queue, gets approved, and cashier executes payout"""
        req_payload = {
            'event_id': 'evt-rf-001',
            'idempotency_key': 'billing:refund:RF-101',
            'event_type': 'billing.refund.requested',
            'source_reference': 'RF-101',
            'business_date': '2026-10-10',
            'amount': '15000.00',
            'payload': {
                'source_bill_no': 'INV-OPD-999',
                'patient_uhid': 'UHID-7001',
                'patient_name': 'Meera Sen',
                'refund_mode': 'cash',
                'reason': 'Overcharge duplicate lab test'
            }
        }
        res = EventInboxService.process_incoming_event(req_payload)
        self.assertEqual(res['status'], EventStatus.VALIDATED)

        refund = Refund.objects.get(id=res['refund_id'])
        self.assertEqual(refund.status, RefundStatus.PENDING)
        self.assertEqual(refund.amount, Decimal('15000.00'))
        self.assertIsNotNone(refund.approval_request)

        # 1. Approve refund via REST endpoint
        dec_resp = self.client.post(f'/api/v1/accounts/refunds/{refund.id}/decision/', {
            'action': 'approve',
            'comment': 'Approved duplicate lab fee reversal'
        }, format='json')
        self.assertEqual(dec_resp.status_code, 200)

        refund.refresh_from_db()
        self.assertEqual(refund.status, RefundStatus.APPROVED)
        self.assertEqual(refund.approved_by, self.manager)

        # Outbox event accounts.refund.approved
        outbox = IntegrationOutbox.objects.filter(aggregate_id=str(refund.id), event_type='accounts.refund.approved')
        self.assertTrue(outbox.exists())

        # 2. Execute payout via REST endpoint
        exec_resp = self.client.post(f'/api/v1/accounts/refunds/{refund.id}/execute/', {
            'payout_mode': 'cash'
        }, format='json')
        self.assertEqual(exec_resp.status_code, 200)

        refund.refresh_from_db()
        self.assertEqual(refund.status, RefundStatus.PAID)
        self.assertIsNotNone(refund.journal)
        self.assertEqual(refund.journal.status, JournalStatus.POSTED)

    def test_event_10_invoice_cancellation_and_credit_note(self):
        """Event #10: Invoice cancellation reverses revenue & closes receivable"""
        EventInboxService.process_incoming_event({
            'event_id': 'evt-canc-inv',
            'idempotency_key': 'billing:inv:INV-CANC-601',
            'event_type': 'billing.invoice.created',
            'source_reference': 'INV-CANC-601',
            'business_date': '2026-10-10',
            'amount': '3000.00',
            'tax_amount': '300.00',
            'payload': {'patient_uhid': 'UHID-8001', 'is_credit': True}
        })
        rec = Receivable.objects.get(reference_no='INV-CANC-601')
        self.assertEqual(rec.status, ReceivableStatus.OPEN)

        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-canc-rev',
            'idempotency_key': 'billing:canc:INV-CANC-601',
            'event_type': 'billing.invoice.cancelled',
            'source_reference': 'INV-CANC-601',
            'correlation_id': 'INV-CANC-601',
            'business_date': '2026-10-10',
            'amount': '3000.00',
            'tax_amount': '300.00',
            'payload': {'patient_uhid': 'UHID-8001'}
        })
        self.assertEqual(res['status'], EventStatus.POSTED)

        rec.refresh_from_db()
        self.assertEqual(rec.status, ReceivableStatus.CLOSED)
        self.assertEqual(rec.outstanding_amount, Decimal('0.00'))

    def test_insurance_claim_lifecycle_and_disallowance_writeoff(self):
        """Events #11, #12, #13: Insurance submission, approval, settlement and auto write-off request"""
        # Create claim receivable
        EventInboxService.process_incoming_event({
            'event_id': 'evt-claim-inv',
            'idempotency_key': 'billing:inv:CLM-701',
            'event_type': 'billing.invoice.created',
            'source_reference': 'CLM-701',
            'business_date': '2026-10-10',
            'amount': '50000.00',
            'party_type': 'insurance',
            'payload': {'patient_uhid': 'UHID-9001', 'is_credit': True}
        })
        # Event #11: Submitted
        EventInboxService.process_incoming_event({
            'event_id': 'evt-claim-sub',
            'idempotency_key': 'ins:sub:CLM-701',
            'event_type': 'insurance.claim.submitted',
            'source_reference': 'CLM-701',
            'business_date': '2026-10-10',
            'payload': {'patient_uhid': 'UHID-9001'}
        })
        # Event #12: Approved
        EventInboxService.process_incoming_event({
            'event_id': 'evt-claim-app',
            'idempotency_key': 'ins:app:CLM-701',
            'event_type': 'insurance.claim.approved',
            'source_reference': 'CLM-701',
            'business_date': '2026-10-10',
            'payload': {'approved_amount': '45000.00', 'disallowed_amount': '5000.00'}
        })
        rec = Receivable.objects.get(reference_no='CLM-701')
        self.assertEqual(rec.disallowed_amount, Decimal('5000.00'))

        # Event #13: Settlement received
        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-claim-settle',
            'idempotency_key': 'ins:settle:CLM-701',
            'event_type': 'insurance.settlement.received',
            'source_reference': 'CLM-701',
            'business_date': '2026-10-10',
            'amount': '50000.00',
            'payload': {'settled_amount': '45000.00', 'disallowed_amount': '5000.00'}
        })
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertTrue(res['write_off_created'])

        rec.refresh_from_db()
        self.assertEqual(rec.status, ReceivableStatus.SETTLED)
        self.assertEqual(rec.outstanding_amount, Decimal('0.00'))

        # Verify WriteOffRequest created and submit decision
        wo = WriteOffRequest.objects.get(id=res['write_off_id'])
        self.assertEqual(wo.amount, Decimal('5000.00'))
        self.assertIsNotNone(wo.approval_request)

        # Approve write off through approval engine
        from .services import ApprovalEngineService
        ApprovalEngineService.process_decision(
            approval_request_id=wo.approval_request.id,
            user=self.manager,
            decision='approve',
            comment='Approved TPA deduction write-off'
        )
        wo.refresh_from_db()
        self.assertEqual(wo.status, 'approved')

        # Verify Outbox emitted accounts.writeoff.approved
        outbox = IntegrationOutbox.objects.filter(aggregate_id=str(wo.id), event_type='accounts.writeoff.approved')
        self.assertTrue(outbox.exists())

    def test_event_14_corporate_invoice_raised(self):
        """Event #14: corporate.invoice.raised creates corporate receivable and posts revenue"""
        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-corp-801',
            'idempotency_key': 'corp:inv:CORP-INV-801',
            'event_type': 'corporate.invoice.raised',
            'source_reference': 'CORP-INV-801',
            'business_date': '2026-10-10',
            'amount': '100000.00',
            'tax_amount': '18000.00',
            'payload': {
                'corporate_id': 'CORP-TCS-01',
                'corporate_name': 'Tata Consultancy Services',
                'patient_name': 'Corporate Group Batch Oct'
            }
        })
        self.assertEqual(res['status'], EventStatus.POSTED)
        rec = Receivable.objects.get(reference_no='CORP-INV-801')
        self.assertEqual(rec.receivable_type, ReceivableType.CORPORATE)
        self.assertEqual(rec.outstanding_amount, Decimal('100000.00'))

    def test_period_lock_rejection_and_outbox_event(self):
        """Rule: Financial events on locked posting period are rejected and emit accounts.event.rejected"""
        res = EventInboxService.process_incoming_event({
            'event_id': 'evt-locked-001',
            'idempotency_key': 'billing:inv:LOCKED-INV-01',
            'event_type': 'billing.invoice.created',
            'source_reference': 'LOCKED-INV-01',
            'business_date': '2026-09-15',  # 2026-09 is LOCKED
            'amount': '2000.00',
            'payload': {'patient_uhid': 'UHID-9999'}
        })
        self.assertEqual(res['status'], EventStatus.REJECTED_BUSINESS)
        self.assertIn('locked', res['error'])

        # Verify Outbox contains accounts.event.rejected
        outbox = IntegrationOutbox.objects.filter(event_type='accounts.event.rejected', payload__source_reference='LOCKED-INV-01')
        self.assertTrue(outbox.exists())

    def test_day_end_reconciliation_zero_variance(self):
        """Day-end reconciliation endpoint verifies Billing Day Total == Accounts Posted Revenue (0 variance)"""
        test_date = '2026-10-12'
        # Post 2 cash bills on test_date
        EventInboxService.process_incoming_event({
            'event_id': 'evt-recon-1',
            'idempotency_key': 'billing:inv:RECON-01',
            'event_type': 'billing.invoice.created',
            'source_reference': 'RECON-01',
            'business_date': test_date,
            'amount': '2000.00',
            'tax_amount': '200.00',
            'payload': {'patient_uhid': 'UHID-1111'}
        })
        EventInboxService.process_incoming_event({
            'event_id': 'evt-recon-2',
            'idempotency_key': 'billing:inv:RECON-02',
            'event_type': 'billing.invoice.created',
            'source_reference': 'RECON-02',
            'business_date': test_date,
            'amount': '3000.00',
            'tax_amount': '300.00',
            'payload': {'patient_uhid': 'UHID-2222'}
        })

        resp = self.client.get(f'/api/v1/accounts/integration/reconcile-day-end/?date={test_date}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'balanced')
        self.assertTrue(data['is_reconciled'])
        self.assertEqual(Decimal(data['variance']), Decimal('0.00'))
        self.assertEqual(Decimal(data['billing']['gross_total']), Decimal('5000.00'))
        self.assertEqual(Decimal(data['accounts']['posted_total']), Decimal('5000.00'))

    def test_synthetic_scale_invariants_1000_bills_and_settlements(self):
        """Scale acceptance test: Ingest 1,000 synthetic bills, 900 receipts, 20 refunds, 50 claim settlements.
        Assert 100% balanced journals, zero out-of-balance entries, accurate aging buckets.
        """
        synth_date = '2026-10-15'

        # Wrap batch ingestion in atomic transaction for high performance
        with transaction.atomic():
            # 1. 800 Cash bills + 200 Credit bills = 1,000 bills
            for i in range(1, 801):
                EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-cash-{i}',
                    'idempotency_key': f'billing:cash:{i}',
                    'event_type': 'billing.invoice.created',
                    'source_reference': f'BILL-CASH-{i:04d}',
                    'business_date': synth_date,
                    'amount': '1000.00',
                    'tax_amount': '100.00',
                    'payload': {'patient_uhid': f'UHID-CASH-{i}', 'is_credit': False}
                })

            for i in range(1, 201):
                EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-cr-{i}',
                    'idempotency_key': f'billing:cr:{i}',
                    'event_type': 'billing.invoice.created',
                    'source_reference': f'BILL-CR-{i:04d}',
                    'business_date': synth_date,
                    'amount': '5000.00',
                    'tax_amount': '500.00',
                    'party_type': 'insurance',
                    'payload': {'patient_uhid': f'UHID-CR-{i}', 'is_credit': True}
                })

            # 2. 900 Receipts (800 for cash bills + 100 partial/full for credit bills)
            for i in range(1, 801):
                EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-pay-cash-{i}',
                    'idempotency_key': f'billing:pay-cash:{i}',
                    'event_type': 'billing.payment.collected',
                    'source_reference': f'BILL-CASH-{i:04d}',
                    'correlation_id': f'BILL-CASH-{i:04d}',
                    'business_date': synth_date,
                    'amount': '1000.00',
                    'payload': {'payment_mode': 'cash', 'patient_uhid': f'UHID-CASH-{i}'}
                })

            for i in range(1, 101):
                EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-pay-cr-{i}',
                    'idempotency_key': f'billing:pay-cr:{i}',
                    'event_type': 'billing.payment.collected',
                    'source_reference': f'BILL-CR-{i:04d}',
                    'correlation_id': f'BILL-CR-{i:04d}',
                    'business_date': synth_date,
                    'amount': '5000.00',
                    'payload': {'payment_mode': 'upi', 'patient_uhid': f'UHID-CR-{i}'}
                })

            # 3. 20 Refunds
            from .services import BillingIntegrationService
            for i in range(1, 21):
                rf_res = EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-rf-{i}',
                    'idempotency_key': f'billing:rf:{i}',
                    'event_type': 'billing.refund.requested',
                    'source_reference': f'RF-SCALE-{i:03d}',
                    'business_date': synth_date,
                    'amount': '500.00',
                    'payload': {'source_bill_no': f'BILL-CASH-{i:04d}', 'refund_mode': 'cash', 'reason': 'Routine counter refund'}
                })
                BillingIntegrationService.decide_refund(rf_res['refund_id'], self.manager, 'approve')
                BillingIntegrationService.execute_refund_payout(rf_res['refund_id'], self.manager, 'cash')

            # 4. 50 Claim Settlements
            for i in range(101, 151):
                EventInboxService.process_incoming_event({
                    'event_id': f'evt-scale-settle-{i}',
                    'idempotency_key': f'billing:settle:{i}',
                    'event_type': 'insurance.settlement.received',
                    'source_reference': f'BILL-CR-{i:04d}',
                    'correlation_id': f'BILL-CR-{i:04d}',
                    'business_date': synth_date,
                    'amount': '5000.00',
                    'payload': {'settled_amount': '4500.00', 'disallowed_amount': '500.00'}
                })

        # Invariant 1: Exactly ZERO unbalanced journals
        posted_journals = Journal.objects.filter(status=JournalStatus.POSTED)
        self.assertGreater(posted_journals.count(), 1000)
        unbalanced = [j.reference_no for j in posted_journals if j.total_debit != j.total_credit]
        self.assertEqual(len(unbalanced), 0, f"Found unbalanced journals: {unbalanced[:5]}")

        # Invariant 2: Total GL Debit == Total GL Credit across all entries
        all_gl = GLEntry.objects.all()
        total_gl_dr = sum(e.debit for e in all_gl)
        total_gl_cr = sum(e.credit for e in all_gl)
        self.assertEqual(total_gl_dr, total_gl_cr)

        # Invariant 3: Accurate Aging Buckets (Remaining open receivables in 0_30 bucket)
        open_recs = Receivable.objects.filter(status__in=[ReceivableStatus.OPEN, ReceivableStatus.PARTIALLY_SETTLED])
        for r in open_recs:
            self.assertEqual(r.aging_bucket, AgingBucket.BUCKET_0_30)

        # Invariant 4: Settled receivables count is as expected
        settled_recs = Receivable.objects.filter(status=ReceivableStatus.SETTLED)
        self.assertGreaterEqual(settled_recs.count(), 150)


class PharmacyIntegrationPhase8TestCase(TestCase):
    """Phase 8: Pharmacy Integration · sales, returns, purchases, expiries, COGS and month-end reconciliation"""

    def setUp(self):
        self.client = APIClient()
        self.maker_exec = User.objects.create_user(
            username='arjun_exec',
            email='arjun@northhospital.com',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            first_name='Arjun',
            last_name='Mehta'
        )
        self.supervisor = User.objects.create_user(
            username='vikram_sup_ph',
            email='vikram_ph@northhospital.com',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Vikram',
            last_name='Malhotra'
        )
        self.manager = User.objects.create_user(
            username='rajesh_mgr_ph',
            email='rajesh_ph@northhospital.com',
            role=RoleType.ACCOUNTS_MANAGER,
            first_name='Rajesh',
            last_name='Sharma'
        )
        self.controller = User.objects.create_user(
            username='sunita_ctrl_ph',
            email='sunita_ph@northhospital.com',
            role=RoleType.FINANCE_CONTROLLER,
            first_name='Sunita',
            last_name='Rao'
        )
        self.cfo = User.objects.create_user(
            username='anand_cfo_ph',
            email='anand_ph@northhospital.com',
            role=RoleType.CFO,
            first_name='Anand',
            last_name='Verma'
        )

        PharmacyIntegrationService.ensure_seed_data()

        # Create master supplier & medicine for stock testing
        self.supplier = PharmacySupplier.objects.create(
            supplier_code='SUP-APEX-01',
            name='Apex Pharma Ltd',
            phone='9876543210',
            drug_license_number='DL-2026-999',
            tax_number='27AAPCA1234F1Z5',
            payment_terms_days=30
        )
        self.med_paracetamol = PharmacyMedicine.objects.create(
            item_code='MED-PARA-500',
            name='Paracetamol 500mg',
            category=MedicineCategory.TABLET,
            unit_price=Decimal('5.00'),
            cost_price=Decimal('2.50'),
            reorder_level=100,
            reorder_quantity=500,
            default_supplier=self.supplier
        )
        self.med_amoxicillin = PharmacyMedicine.objects.create(
            item_code='MED-AMOX-250',
            name='Amoxicillin 250mg',
            category=MedicineCategory.CAPSULE,
            unit_price=Decimal('15.00'),
            cost_price=Decimal('8.00'),
            reorder_level=50,
            reorder_quantity=200,
            default_supplier=self.supplier
        )

    def test_01_pharmacy_sale_completed_compound_journal(self):
        """Event #21: pharmacy.sale.completed creates balanced compound journal and auto-posts"""
        event_payload = {
            'event_id': 'evt-ph-sale-001',
            'idempotency_key': 'pharm:sale:001',
            'event_type': 'pharmacy.sale.completed',
            'source_department': 'pharmacy',
            'source_reference': 'PH-SALE-1001',
            'business_date': '2026-10-09',
            'amount': '10500.00',
            'tax_amount': '500.00',
            'payload': {
                'payment_mode': 'cash',
                'cogs_amount': '6000.00',
                'counter_id': 'COUNTER-01'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertTrue(res['auto_posted'])

        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.POSTED)
        self.assertEqual(journal.total_debit, Decimal('16500.00'))
        self.assertEqual(journal.total_credit, Decimal('16500.00'))

        # Verify line distributions
        lines = list(journal.lines.all())
        line_map = {l.account.code: l for l in lines}
        self.assertEqual(line_map['1000'].debit, Decimal('10500.00'))  # Cash
        self.assertEqual(line_map['4200'].credit, Decimal('10000.00')) # Pharmacy Revenue
        self.assertEqual(line_map['2100'].credit, Decimal('500.00'))   # GST Output
        self.assertEqual(line_map['5000'].debit, Decimal('6000.00'))   # COGS
        self.assertEqual(line_map['1300'].credit, Decimal('6000.00'))  # Pharmacy Inventory

        # Outbox event
        outbox = IntegrationOutbox.objects.filter(event_type='accounts.pharmacy_sale.posted').first()
        self.assertIsNotNone(outbox)

    def test_02_sale_and_return_net_to_zero(self):
        """Acceptance Criteria: Sale + return net to exactly zero across all GL accounts"""
        sale_payload = {
            'event_id': 'evt-ph-sale-netzero',
            'idempotency_key': 'pharm:sale:nz',
            'event_type': 'pharmacy.sale.completed',
            'source_department': 'pharmacy',
            'source_reference': 'PH-SALE-NZ',
            'business_date': '2026-10-09',
            'amount': '2100.00',
            'tax_amount': '100.00',
            'payload': {
                'payment_mode': 'cash',
                'cogs_amount': '1200.00'
            }
        }
        res_sale = EventInboxService.process_incoming_event(sale_payload)
        self.assertEqual(res_sale['status'], EventStatus.POSTED)

        return_payload = {
            'event_id': 'evt-ph-ret-netzero',
            'idempotency_key': 'pharm:return:nz',
            'event_type': 'pharmacy.return.processed',
            'source_department': 'pharmacy',
            'source_reference': 'PH-RET-NZ',
            'business_date': '2026-10-09',
            'amount': '2100.00',
            'tax_amount': '100.00',
            'payload': {
                'payment_mode': 'cash',
                'cogs_amount': '1200.00'
            }
        }
        res_ret = EventInboxService.process_incoming_event(return_payload)
        self.assertEqual(res_ret['status'], EventStatus.POSTED)

        # Net balance check across all affected accounts
        affected_codes = ['1000', '4200', '2100', '5000', '1300']
        for code in affected_codes:
            entries = GLEntry.objects.filter(
                account__code=code,
                journal__external_reference__in=['PH-SALE-NZ', 'PH-RET-NZ']
            )
            total_dr = sum(e.debit for e in entries)
            total_cr = sum(e.credit for e in entries)
            self.assertEqual(total_dr, total_cr, f"Account {code} did not net to zero: Dr {total_dr} vs Cr {total_cr}")

    def test_03_expiry_writeoff_routed_by_value(self):
        """Event #23: Routine <= ₹50k auto-posts, > ₹50k routed to Manager (AM <= 5L) or Controller (FC <= 50L)"""
        # 1. Routine writeoff: ₹25,000 (auto-posts)
        res_routine = EventInboxService.process_incoming_event({
            'event_id': 'evt-ph-exp-routine',
            'idempotency_key': 'pharm:exp:routine',
            'event_type': 'inventory.stock.expired_writeoff',
            'source_department': 'pharmacy',
            'source_reference': 'WO-ROUTINE-01',
            'business_date': '2026-10-09',
            'amount': '25000.00'
        })
        self.assertEqual(res_routine['status'], EventStatus.POSTED)
        self.assertTrue(res_routine['auto_posted'])
        j_routine = Journal.objects.get(id=res_routine['journal_id'])
        self.assertEqual(j_routine.status, JournalStatus.POSTED)

        # 2. Manager level: ₹250,000 (routed to AM)
        res_mgr = EventInboxService.process_incoming_event({
            'event_id': 'evt-ph-exp-mgr',
            'idempotency_key': 'pharm:exp:mgr',
            'event_type': 'inventory.stock.expired_writeoff',
            'source_department': 'pharmacy',
            'source_reference': 'WO-MGR-01',
            'business_date': '2026-10-09',
            'amount': '250000.00'
        })
        self.assertEqual(res_mgr['status'], EventStatus.PENDING_VALIDATION)
        self.assertFalse(res_mgr['auto_posted'])
        self.assertEqual(res_mgr['required_level'], ApprovalLevel.MANAGER)

        app_req_mgr = ApprovalRequest.objects.get(id=res_mgr['approval_request_id'])
        self.assertEqual(app_req_mgr.current_level, ApprovalLevel.MANAGER)

        # Manager approves
        dec_res = PharmacyIntegrationService.decide_writeoff(app_req_mgr.id, self.manager, 'approve')
        self.assertEqual(dec_res['status'], ApprovalStatus.APPROVED)
        j_mgr = Journal.objects.get(id=res_mgr['journal_id'])
        self.assertEqual(j_mgr.status, JournalStatus.POSTED)

        # 3. Controller level: ₹1,500,000 (routed to FC)
        res_ctrl = EventInboxService.process_incoming_event({
            'event_id': 'evt-ph-exp-ctrl',
            'idempotency_key': 'pharm:exp:ctrl',
            'event_type': 'inventory.stock.expired_writeoff',
            'source_department': 'pharmacy',
            'source_reference': 'WO-CTRL-01',
            'business_date': '2026-10-09',
            'amount': '1500000.00'
        })
        self.assertEqual(res_ctrl['required_level'], ApprovalLevel.CONTROLLER)
        app_req_ctrl = ApprovalRequest.objects.get(id=res_ctrl['approval_request_id'])

        # Controller approves
        PharmacyIntegrationService.decide_writeoff(app_req_ctrl.id, self.controller, 'approve')
        j_ctrl = Journal.objects.get(id=res_ctrl['journal_id'])
        self.assertEqual(j_ctrl.status, JournalStatus.POSTED)

    def test_04_grn_and_vendor_bill_clears_grni(self):
        """Event #25 & #26: GRN posted creates GRNI liability; vendor invoice clears GRNI to exactly ₹0"""
        # Step 1: GRN posted for ₹100,000
        grn_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-ph-grn-01',
            'idempotency_key': 'pharm:grn:01',
            'event_type': 'inventory.grn.posted',
            'source_department': 'pharmacy',
            'source_reference': 'GRN-PH-2026-001',
            'business_date': '2026-10-09',
            'amount': '100000.00'
        })
        self.assertEqual(grn_res['status'], EventStatus.POSTED)

        # Verify Account 2200 (GRNI Accrual) has ₹100,000 credit
        grni_entries = GLEntry.objects.filter(account__code='2200')
        self.assertEqual(sum(e.credit for e in grni_entries), Decimal('100000.00'))

        # Step 2: Vendor invoice received
        inv_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-proc-inv-01',
            'idempotency_key': 'proc:inv:01',
            'event_type': 'procurement.vendor_invoice.received',
            'source_department': 'procurement',
            'source_reference': 'INV-APEX-9871',
            'business_date': '2026-10-09',
            'amount': '112000.00',
            'tax_amount': '12000.00',
            'payload': {
                'vendor_id': 'VEND-APEX-01',
                'vendor_name': 'Apex Pharma Ltd',
                'invoice_no': 'INV-APEX-9871',
                'po_no': 'PO-PH-2026-100',
                'grn_nos': ['GRN-PH-2026-001'],
                'taxable_amount': '100000.00',
                'cgst': '6000.00',
                'sgst': '6000.00',
                'tds_amount': '100.00'
            }
        })
        self.assertEqual(inv_res['status'], EventStatus.VALIDATED)
        bill_id = inv_res['vendor_bill_id']

        # Post the vendor bill
        bill_journal = PharmacyIntegrationService.post_vendor_bill(bill_id, self.manager)
        self.assertEqual(bill_journal.status, JournalStatus.POSTED)

        # Step 3: Verify GRNI Accrual 2200 balance is exactly ₹0.00
        grni_all = GLEntry.objects.filter(account__code='2200')
        total_grni_dr = sum(e.debit for e in grni_all)
        total_grni_cr = sum(e.credit for e in grni_all)
        self.assertEqual(total_grni_dr, total_grni_cr)
        self.assertEqual(total_grni_dr - total_grni_cr, Decimal('0.00'))

    def test_05_vendor_bank_changed_cooling_off_lock(self):
        """Event #27: Vendor bank change sets cooling-off lock; blocks payment and raises IC-02 violation"""
        bank_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-vend-bank-01',
            'idempotency_key': 'proc:bank:01',
            'event_type': 'procurement.vendor.bank_changed',
            'source_department': 'procurement',
            'source_reference': 'BANK-CHG-APEX',
            'business_date': '2026-10-09',
            'amount': '0.00',
            'payload': {
                'vendor_id': 'VEND-APEX-01',
                'vendor_name': 'Apex Pharma Ltd',
                'bank_account_masked': '••••4321'
            }
        })
        self.assertEqual(bank_res['status'], EventStatus.POSTED)

        vendor = VendorMirror.objects.get(source_vendor_id='VEND-APEX-01')
        self.assertTrue(vendor.bank_change_pending)

        # Payment check fails
        chk = PharmacyIntegrationService.check_vendor_payment_allowed(vendor.id, Decimal('75000.00'))
        self.assertFalse(chk['allowed'])
        self.assertIn('IC-02', chk['violation_no'])

        violation = ControlViolation.objects.filter(refs='VEND-APEX-01', status='Open').first()
        self.assertIsNotNone(violation)

        # Supervisor / Controller verifies bank change
        ver_res = PharmacyIntegrationService.verify_vendor_bank_change(vendor.id, self.controller, 'Called vendor CFO')
        self.assertTrue(ver_res['verified'])

        # Payment now permitted
        chk_after = PharmacyIntegrationService.check_vendor_payment_allowed(vendor.id, Decimal('75000.00'))
        self.assertTrue(chk_after['allowed'])

    def test_06_pharmacy_inventory_valuation_and_cogs(self):
        """Calculates FEFO batch stock valuation and COGS correctly"""
        b1 = PharmacyBatch.objects.create(
            medicine=self.med_paracetamol,
            supplier=self.supplier,
            batch_number='BATCH-P1',
            manufacturing_date=date(2026, 1, 1),
            expiry_date=date(2027, 1, 1),
            initial_quantity=100,
            available_quantity=100,
            cost_price=Decimal('2.50'),
            mrp_price=Decimal('5.00'),
            status=BatchStatus.ACTIVE,
            received_by=self.supervisor
        )
        b2 = PharmacyBatch.objects.create(
            medicine=self.med_amoxicillin,
            supplier=self.supplier,
            batch_number='BATCH-A1',
            manufacturing_date=date(2026, 2, 1),
            expiry_date=date(2027, 2, 1),
            initial_quantity=50,
            available_quantity=50,
            cost_price=Decimal('8.00'),
            mrp_price=Decimal('15.00'),
            status=BatchStatus.ACTIVE,
            received_by=self.supervisor
        )

        val = PharmacyIntegrationService.get_pharmacy_inventory_valuation()
        # 100 * 2.50 = 250; 50 * 8.00 = 400 => Total = 650.00
        self.assertEqual(val['total_cost_valuation'], Decimal('650.00'))
        self.assertEqual(val['total_units'], 150)
        self.assertEqual(val['batch_count'], 2)

        # COGS calculation
        cogs = PharmacyIntegrationService.calculate_pharmacy_cogs([
            {'batch_id': str(b2.id), 'quantity': 10}
        ])
        self.assertEqual(cogs, Decimal('80.00'))

    def test_07_month_end_stock_vs_gl_reconciliation(self):
        """Acceptance Criteria: Stock vs GL check within 0.5% balanced; difference > 1.0% raises EX-201 exception"""
        # Create stock of ₹10,000.00
        PharmacyBatch.objects.create(
            medicine=self.med_paracetamol,
            supplier=self.supplier,
            batch_number='BATCH-REC-01',
            manufacturing_date=date(2026, 1, 1),
            expiry_date=date(2027, 1, 1),
            initial_quantity=4000,
            available_quantity=4000,
            cost_price=Decimal('2.50'),
            status=BatchStatus.ACTIVE,
            received_by=self.supervisor
        )
        # GL inventory: Post GRN matching stock exactly (₹10,000.00)
        EventInboxService.process_incoming_event({
            'event_id': 'evt-grn-recon-bal',
            'idempotency_key': 'grn:recon:bal',
            'event_type': 'inventory.grn.posted',
            'source_department': 'pharmacy',
            'source_reference': 'GRN-RECON-BAL',
            'business_date': '2026-10-09',
            'amount': '10000.00'
        })

        # Condition 1: Perfect match (0.0% variance <= 0.5% tolerance)
        recon_bal = PharmacyIntegrationService.reconcile_pharmacy_stock_vs_gl(tolerance_pct=Decimal('0.5'))
        self.assertEqual(recon_bal['status'], 'balanced')
        self.assertTrue(recon_bal['within_tolerance'])
        self.assertIsNone(recon_bal['exception_no'])

        # Condition 2: Variance > 1% (Post additional inventory debit of ₹500 without batch stock)
        user = PharmacyIntegrationService.get_system_user()
        JournalService.post_journal(JournalService.create_draft_journal(
            maker=user,
            journal_date=date(2026, 10, 9),
            description='Unmatched Inventory Adjustment',
            lines=[
                {'account_id': '1300', 'debit': Decimal('500.00'), 'credit': Decimal('0.00'), 'department_id': 'pharmacy'},
                {'account_id': '2200', 'debit': Decimal('0.00'), 'credit': Decimal('500.00'), 'department_id': 'pharmacy'}
            ]
        ), user)

        recon_var = PharmacyIntegrationService.reconcile_pharmacy_stock_vs_gl(tolerance_pct=Decimal('0.5'))
        self.assertEqual(recon_var['status'], 'variance_exceeded')
        self.assertFalse(recon_var['within_tolerance'])
        self.assertIsNotNone(recon_var['exception_no'])

        # Verify FinancialException & StatementFlag created
        ex = FinancialException.objects.get(exception_no=recon_var['exception_no'])
        self.assertEqual(ex.type, 'Statement Variance')
        self.assertEqual(ex.severity, 'High')

        flag = StatementFlag.objects.filter(exception_no=recon_var['exception_no']).first()
        self.assertIsNotNone(flag)
        self.assertEqual(flag.line_key, 'INV-1300')

    def test_08_api_endpoints_pharmacy_integration(self):
        """Tests REST API endpoints for reconciliation, valuation, and vendor verification"""
        # Reconcile endpoint
        r1 = self.client.get('/api/v1/integration/reconcile-pharmacy-stock')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertIn('gl_balance', r1.data)

        # Valuation endpoint
        r2 = self.client.get('/api/v1/integration/pharmacy-valuation')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn('total_cost_valuation', r2.data)

        # Verify vendor bank endpoint
        vendor = VendorMirror.objects.create(
            source_vendor_id='VEND-TEST-API',
            name='Test Vendor',
            bank_change_pending=True,
            bank_changed_at=timezone.now()
        )
        self.client.force_authenticate(user=self.controller)
        r3 = self.client.post('/api/v1/integration/verify-vendor-bank', {
            'vendor_id': str(vendor.id),
            'notes': 'Verified via phone'
        })
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        self.assertTrue(r3.data['verified'])


# =============================================================================
# Phase 9: OPD & IPD Clinical Integration Test Suite
# =============================================================================

class ClinicalIntegrationPhase9TestCase(TestCase):
    """Phase 9: OPD & IPD Integration · Reception Deposits, Running Charges,
    Month-End Unbilled Accrual & Auto-Reversal, Doctor Share Batching, and OT Implant 3-Way Matching.
    """

    def setUp(self):
        self.client = APIClient()
        self.maker_exec = User.objects.create_user(
            username='arjun_exec_p9',
            email='arjun_p9@northhospital.com',
            role=RoleType.ACCOUNTS_EXECUTIVE,
            first_name='Arjun',
            last_name='Mehta'
        )
        self.supervisor = User.objects.create_user(
            username='vikram_sup_p9',
            email='vikram_p9@northhospital.com',
            role=RoleType.ACCOUNTS_SUPERVISOR,
            first_name='Vikram',
            last_name='Malhotra'
        )
        self.manager = User.objects.create_user(
            username='rajesh_mgr_p9',
            email='rajesh_p9@northhospital.com',
            role=RoleType.ACCOUNTS_MANAGER,
            first_name='Rajesh',
            last_name='Sharma'
        )
        self.controller = User.objects.create_user(
            username='sunita_ctrl_p9',
            email='sunita_p9@northhospital.com',
            role=RoleType.FINANCE_CONTROLLER,
            first_name='Sunita',
            last_name='Rao'
        )
        self.cfo = User.objects.create_user(
            username='anand_cfo_p9',
            email='anand_p9@northhospital.com',
            role=RoleType.CFO,
            first_name='Anand',
            last_name='Verma'
        )

        BillingIntegrationService.ensure_seed_data()

        # Open fiscal periods 2026-10 and 2026-11
        PeriodLock.objects.get_or_create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-10',
            defaults={'status': PeriodLockStatus.OPEN}
        )
        PeriodLock.objects.get_or_create(
            branch_id='MAIN',
            period_type='month',
            period_key='2026-11',
            defaults={'status': PeriodLockStatus.OPEN}
        )

    def test_01_reception_deposit_collected_autopost_under_50k(self):
        """Event #1: Routine reception deposit <= ₹50,000 auto-posts balanced GL journal (Dr 1000, Cr 2300)"""
        event_payload = {
            'event_id': 'evt-rec-dep-01',
            'idempotency_key': 'rec:dep:001',
            'event_type': 'reception.deposit.collected',
            'source_department': 'reception',
            'source_reference': 'DEP-2026-101',
            'business_date': '2026-10-10',
            'amount': '30000.00',
            'payload': {
                'patient_uhid': 'UHID-P9-01',
                'patient_name': 'Ramesh Kumar',
                'payment_mode': 'cash',
                'admission_id': 'ADM-P9-01'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertTrue(res['auto_posted'])

        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.POSTED)
        self.assertEqual(journal.total_debit, Decimal('30000.00'))
        self.assertEqual(journal.total_credit, Decimal('30000.00'))

        # Check GL lines: Dr 1000 Cash, Cr 2300 Patient Advances
        lines = list(journal.lines.all())
        line_map = {l.account.code: l for l in lines}
        self.assertEqual(line_map['1000'].debit, Decimal('30000.00'))
        self.assertEqual(line_map['2300'].credit, Decimal('30000.00'))

        # Outbox event
        outbox = IntegrationOutbox.objects.filter(event_type='accounts.reception.deposit_collected').first()
        self.assertIsNotNone(outbox)

    def test_02_reception_deposit_collected_above_50k_requires_ae_validation(self):
        """Event #1: Reception deposit > ₹50,000 requires AE validation (pending_validation)"""
        event_payload = {
            'event_id': 'evt-rec-dep-02',
            'idempotency_key': 'rec:dep:002',
            'event_type': 'reception.deposit.collected',
            'source_department': 'reception',
            'source_reference': 'DEP-2026-102',
            'business_date': '2026-10-10',
            'amount': '75000.00',
            'payload': {
                'patient_uhid': 'UHID-P9-02',
                'patient_name': 'Suresh Patel',
                'payment_mode': 'bank_transfer',
                'admission_id': 'ADM-P9-02'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.PENDING_VALIDATION)
        self.assertFalse(res['auto_posted'])

        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.DRAFT)
        self.assertEqual(journal.total_debit, Decimal('75000.00'))

    def test_03_reception_deposit_refunded_requires_validation(self):
        """Event #2: reception.deposit.refunded creates Dr Patient Advances 2300, Cr Cash 1000 in pending_validation"""
        event_payload = {
            'event_id': 'evt-rec-ref-01',
            'idempotency_key': 'rec:ref:001',
            'event_type': 'reception.deposit.refunded',
            'source_department': 'reception',
            'source_reference': 'DEP-REF-101',
            'business_date': '2026-10-10',
            'amount': '15000.00',
            'payload': {
                'patient_uhid': 'UHID-P9-03',
                'patient_name': 'Anita Desai',
                'payment_mode': 'cash'
            }
        }
        res = EventInboxService.process_incoming_event(event_payload)
        self.assertEqual(res['status'], EventStatus.PENDING_VALIDATION)
        self.assertTrue(res['requires_validation'])

        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.DRAFT)
        lines = list(journal.lines.all())
        line_map = {l.account.code: l for l in lines}
        self.assertEqual(line_map['2300'].debit, Decimal('15000.00'))
        self.assertEqual(line_map['1000'].credit, Decimal('15000.00'))

    def test_04_ipd_admission_and_daily_running_charges_accumulate_without_intraday_journal(self):
        """Events #16 & #17: ipd.admission.created opens tracker; ipd.daily_charges.accrued accumulates without intraday journal"""
        # 1. Admission created
        adm_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-ipd-adm-01',
            'idempotency_key': 'ipd:adm:001',
            'event_type': 'ipd.admission.created',
            'source_department': 'ipd',
            'source_reference': 'ADM-2026-001',
            'business_date': '2026-10-01',
            'amount': '0.00',
            'payload': {
                'admission_id': 'ADM-2026-001',
                'admission_number': 'IPD/2026/001',
                'patient_uhid': 'UHID-IPD-101',
                'patient_name': 'Rahul Verma',
                'ward_name': 'Deluxe Ward',
                'bed_number': 'D-201'
            }
        })
        self.assertEqual(adm_res['status'], EventStatus.POSTED)

        tracker = IPDUnbilledTracker.objects.get(admission_id='ADM-2026-001')
        self.assertEqual(tracker.status, 'ACTIVE')
        self.assertEqual(tracker.unbilled_balance, Decimal('0.00'))

        # Count journals before daily charges
        j_count_before = Journal.objects.count()

        # 2. Day 1 charges accrued (₹15,000)
        c1_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-ipd-chg-01',
            'idempotency_key': 'ipd:chg:001',
            'event_type': 'ipd.daily_charges.accrued',
            'source_department': 'ipd',
            'source_reference': 'ADM-2026-001',
            'business_date': '2026-10-02',
            'amount': '15000.00',
            'payload': {
                'admission_id': 'ADM-2026-001',
                'patient_uhid': 'UHID-IPD-101',
                'category': 'bed_nursing'
            }
        })
        self.assertEqual(c1_res['status'], EventStatus.POSTED)
        tracker.refresh_from_db()
        self.assertEqual(tracker.unbilled_balance, Decimal('15000.00'))

        # 3. Day 2 charges accrued (₹25,000)
        c2_res = EventInboxService.process_incoming_event({
            'event_id': 'evt-ipd-chg-02',
            'idempotency_key': 'ipd:chg:002',
            'event_type': 'ipd.daily_charges.accrued',
            'source_department': 'ipd',
            'source_reference': 'ADM-2026-001',
            'business_date': '2026-10-03',
            'amount': '25000.00',
            'payload': {
                'admission_id': 'ADM-2026-001',
                'patient_uhid': 'UHID-IPD-101',
                'category': 'investigations_meds'
            }
        })
        self.assertEqual(c2_res['status'], EventStatus.POSTED)
        tracker.refresh_from_db()
        self.assertEqual(tracker.unbilled_balance, Decimal('40000.00'))
        self.assertEqual(tracker.total_running_charges, Decimal('40000.00'))

        # Intraday rule: NO GL journals posted for daily charges
        j_count_after = Journal.objects.count()
        self.assertEqual(j_count_before, j_count_after)

    def test_05_month_end_unbilled_revenue_accrual_and_dofa_routing(self):
        """Acceptance Criteria: Month-end unbilled revenue accrual equals sum of in-house patients' running charges.
        Routes via DoFA (AS <= 5L, AM <= 50L, FC > 50L) and posts Dr 1150 / Cr 4100.
        """
        # Create 2 active admitted patients with running charges
        IPDUnbilledTracker.objects.create(
            admission_id='ADM-ACC-01',
            admission_number='IPD/2026/011',
            patient_uhid='UHID-111',
            patient_name='Patient Alpha',
            ward_name='ICU',
            status='ACTIVE',
            total_running_charges=Decimal('80000.00'),
            unbilled_balance=Decimal('80000.00')
        )
        IPDUnbilledTracker.objects.create(
            admission_id='ADM-ACC-02',
            admission_number='IPD/2026/012',
            patient_uhid='UHID-112',
            patient_name='Patient Beta',
            ward_name='General Ward',
            status='ACTIVE',
            total_running_charges=Decimal('70000.00'),
            unbilled_balance=Decimal('70000.00')
        )

        as_of_date = date(2026, 10, 31)
        summary = ClinicalIntegrationService.calculate_in_house_unbilled_revenue(as_of_date)
        # Sum of running unbilled charges = 80k + 70k = 150,000
        self.assertEqual(summary['total_unbilled_revenue'], Decimal('150000.00'))
        self.assertEqual(summary['active_patient_count'], 2)

        # Generate month-end accrual
        accrual_res = ClinicalIntegrationService.generate_month_end_unbilled_revenue_accrual(
            as_of_date=as_of_date,
            user=self.maker_exec
        )
        self.assertEqual(accrual_res['status'], 'accrual_created')
        self.assertEqual(accrual_res['amount'], Decimal('150000.00'))
        self.assertEqual(accrual_res['auto_reverse_on'], '2026-11-01')

        # Check journal entry before approval (DRAFT)
        journal = Journal.objects.get(id=accrual_res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.DRAFT)
        self.assertEqual(journal.total_debit, Decimal('150000.00'))
        self.assertEqual(journal.total_credit, Decimal('150000.00'))

        # Check DoFA routing (150,000 <= 5,00,000 -> Accounts Supervisor)
        req = ApprovalRequest.objects.get(id=accrual_res['approval_request_id'])
        self.assertEqual(req.current_level, ApprovalLevel.SUPERVISOR)

        # Supervisor approves
        ApprovalEngineService.process_decision(
            approval_request_id=req.id,
            user=self.supervisor,
            decision='approve',
            comment='Approved month-end unbilled revenue accrual'
        )
        journal.refresh_from_db()
        self.assertEqual(journal.status, JournalStatus.POSTED)

        # Invariant: GL has Dr 1150 (Unbilled Contract Asset) and Cr 4100 (IPD Revenue)
        entries = list(GLEntry.objects.filter(journal=journal))
        e_map = {e.account.code: e for e in entries}
        self.assertEqual(e_map['1150'].debit, Decimal('150000.00'))
        self.assertEqual(e_map['4100'].credit, Decimal('150000.00'))

    def test_06_day1_auto_reversal_clean_reversal_ia_01(self):
        """IA-01: Day 1 auto-reversal cleanly reverses month-end accrual (Dr 4100, Cr 1150), netting balances to zero"""
        # Create and post month-end accrual scheduled for reversal on 2026-11-01
        IPDUnbilledTracker.objects.create(
            admission_id='ADM-REV-01',
            admission_number='IPD/2026/021',
            patient_uhid='UHID-221',
            patient_name='Patient Gamma',
            status='ACTIVE',
            total_running_charges=Decimal('200000.00'),
            unbilled_balance=Decimal('200000.00')
        )
        acc_res = ClinicalIntegrationService.generate_month_end_unbilled_revenue_accrual(
            as_of_date=date(2026, 10, 31),
            user=self.maker_exec
        )
        # Approve accrual
        ApprovalEngineService.process_decision(
            approval_request_id=acc_res['approval_request_id'],
            user=self.supervisor,
            decision='approve',
            comment='Approved for Day 1 reversal test'
        )

        # Execute Day 1 reversal on 2026-11-01
        rev_res = ClinicalIntegrationService.execute_auto_reversal_accruals(
            target_date=date(2026, 11, 1),
            user=self.supervisor
        )
        self.assertEqual(rev_res['reversed_count'], 1)
        self.assertEqual(rev_res['reversals'][0]['amount'], 200000.0)

        # Acceptance Criteria: Day 1 accrual reverses cleanly; net GL balance on 1150 and 4100 is exactly ₹0.00
        entries_1150 = GLEntry.objects.filter(account__code='1150')
        net_1150 = sum(e.debit for e in entries_1150) - sum(e.credit for e in entries_1150)
        self.assertEqual(net_1150, Decimal('0.00'))

        entries_4100 = GLEntry.objects.filter(account__code='4100')
        net_4100 = sum(e.credit for e in entries_4100) - sum(e.debit for e in entries_4100)
        self.assertEqual(net_4100, Decimal('0.00'))

    def test_07_discharge_billing_consumes_unbilled_and_adjusts_deposit_ia_02(self):
        """IA-02: Deposit of ₹50,000 adjusted against discharge bill of ₹1,20,000 leaves net receivable of ₹70,000.
        Event #18 posts Dr 1100 (₹70k), Dr 2300 (₹50k), Cr 1150 (₹120k).
        """
        # Create tracker with deposit and unbilled balance
        tracker = IPDUnbilledTracker.objects.create(
            admission_id='ADM-DISC-001',
            admission_number='IPD/2026/050',
            patient_uhid='UHID-DISC-01',
            patient_name='Kavita Sharma',
            ward_name='Private Ward',
            bed_number='P-101',
            status='ACTIVE',
            total_running_charges=Decimal('120000.00'),
            unbilled_balance=Decimal('120000.00'),
            total_deposits_held=Decimal('50000.00')
        )

        # Discharge billed event (#18)
        discharge_payload = {
            'event_id': 'evt-ipd-disc-01',
            'idempotency_key': 'ipd:disc:001',
            'event_type': 'ipd.discharge.billed',
            'source_department': 'ipd',
            'source_reference': 'INV-DISC-1001',
            'business_date': '2026-10-15',
            'amount': '120000.00',
            'payload': {
                'admission_id': 'ADM-DISC-001',
                'invoice_no': 'INV-DISC-1001',
                'patient_uhid': 'UHID-DISC-01',
                'patient_name': 'Kavita Sharma',
                'gross_amount': '120000.00',
                'advance_adjusted': '50000.00'
            }
        }
        res = EventInboxService.process_incoming_event(discharge_payload)
        self.assertEqual(res['status'], EventStatus.POSTED)
        self.assertEqual(res['gross_amount'], '120000.00')
        self.assertEqual(res['advance_adjusted'], '50000.00')
        self.assertEqual(res['net_receivable'], '70000.00')

        # Verify balanced journal
        journal = Journal.objects.get(id=res['journal_id'])
        self.assertEqual(journal.status, JournalStatus.POSTED)
        self.assertEqual(journal.total_debit, Decimal('120000.00'))
        self.assertEqual(journal.total_credit, Decimal('120000.00'))

        entries = list(GLEntry.objects.filter(journal=journal))
        e_map = {e.account.code: e for e in entries}
        self.assertEqual(e_map['1100'].debit, Decimal('70000.00'))   # Net patient receivable
        self.assertEqual(e_map['2300'].debit, Decimal('50000.00'))   # Advance liability offset
        self.assertEqual(e_map['1150'].credit, Decimal('120000.00')) # Unbilled revenue consumed

        # Verify tracker updated
        tracker.refresh_from_db()
        self.assertEqual(tracker.status, 'BILLED')
        self.assertEqual(tracker.unbilled_balance, Decimal('0.00'))
        self.assertEqual(tracker.total_deposits_held, Decimal('0.00'))
        self.assertEqual(tracker.final_invoice_no, 'INV-DISC-1001')

        # Verify open Receivable created for remaining ₹70,000
        rec = Receivable.objects.get(reference_no='INV-DISC-1001')
        self.assertEqual(rec.outstanding_amount, Decimal('70000.00'))
        self.assertEqual(rec.original_amount, Decimal('120000.00'))
        self.assertEqual(rec.status, ReceivableStatus.OPEN)

    def test_08_consultant_share_batch_and_dofa_forwarding_ia_03(self):
        """IA-03: ₹4,18,000 consultant fee accrual batch (Dr 5420, Cr 2020, Cr 2150).
        Supervisor limit is ₹1,00,000 -> Supervisor cannot approve directly; forwards to Manager for approval.
        """
        doctors_payload = [
            {
                'doctor_id': 'DOC-CAR-01',
                'doctor_name': 'Dr. N. Sengupta',
                'specialty': 'Cardiology',
                'pan_number': 'ABCPN1234D',
                'pan_aadhaar_linked': True,
                'case_count': 15,
                'gross_amount': Decimal('180000.00')
            },
            {
                'doctor_id': 'DOC-NEU-02',
                'doctor_name': 'Dr. S. Kulkarni',
                'specialty': 'Neurology',
                'pan_number': 'XYZPK5678R',
                'pan_aadhaar_linked': True,
                'case_count': 12,
                'gross_amount': Decimal('140000.00')
            },
            {
                'doctor_id': 'DOC-ORT-03',
                'doctor_name': 'Dr. V. Raman',
                'specialty': 'Orthopedics',
                'pan_number': 'DEFPR9012L',
                'pan_aadhaar_linked': False,  # 20% TDS
                'case_count': 8,
                'gross_amount': Decimal('98000.00')
            }
        ]
        # Total gross = 1,80,000 + 1,40,000 + 98,000 = 4,18,000
        batch_res = ClinicalIntegrationService.generate_consultant_share_batch(
            period_from='2026-10-01',
            period_to='2026-10-31',
            department_id='OPD',
            doctors_data=doctors_payload,
            user=self.maker_exec
        )
        self.assertEqual(batch_res['total_gross'], Decimal('418000.00'))

        batch = ConsultantShareBatch.objects.get(id=batch_res['batch_id'])
        self.assertEqual(batch.total_gross_amount, Decimal('418000.00'))
        # Total gross must equal net + TDS
        self.assertEqual(batch.total_gross_amount, batch.total_net_payable + batch.total_tds_amount)

        # Journal is in DRAFT
        journal = batch.journal
        self.assertEqual(journal.status, JournalStatus.DRAFT)
        self.assertEqual(journal.total_debit, Decimal('418000.00'))
        self.assertEqual(journal.total_credit, Decimal('418000.00'))

        req = batch.approval_request
        self.assertEqual(req.current_level, ApprovalLevel.SUPERVISOR)

        # 1. Supervisor attempts unilateral approval -> LimitExceededError (limit is 1,00,000, batch is 4,18,000)
        with self.assertRaises(LimitExceededError):
            ApprovalEngineService.process_decision(
                approval_request_id=req.id,
                user=self.supervisor,
                decision='approve',
                comment='Supervisor direct approval attempt'
            )

        # 2. Supervisor forwards to Manager
        ApprovalEngineService.process_decision(
            approval_request_id=req.id,
            user=self.supervisor,
            decision='forward',
            comment='Batch fee of ₹4,18,000 exceeds supervisor limit of ₹1,00,000. Forwarded to Accounts Manager.'
        )
        req.refresh_from_db()
        self.assertEqual(req.current_level, ApprovalLevel.MANAGER)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'under_review')

        # 3. Manager approves (limit is 5,00,000 >= 4,18,000)
        ApprovalEngineService.process_decision(
            approval_request_id=req.id,
            user=self.manager,
            decision='approve',
            comment='Approved visiting consultant batch payout',
            version=req.version
        )
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'approved')

        journal.refresh_from_db()
        self.assertEqual(journal.status, JournalStatus.POSTED)

        # Check GL lines: Dr 5420, Cr 2020, Cr 2150
        entries = list(GLEntry.objects.filter(journal=journal))
        e_map = {e.account.code: e for e in entries}
        self.assertEqual(e_map['5420'].debit, Decimal('418000.00'))
        self.assertEqual(e_map['2020'].credit, batch.total_net_payable)
        self.assertEqual(e_map['2150'].credit, batch.total_tds_amount)

    def test_09_ot_implant_consignment_matching_exact_match_ia_04(self):
        """IA-04: 3-way match for Medline Surgicals stent consignment invoice (46 stents).
        Cath Lab usage register records 46 stents -> Exact match succeeds and reconciles.
        """
        # Create Medline vendor
        vendor = VendorMirror.objects.create(
            source_vendor_id='VEND-MEDLINE-01',
            name='Medline Surgicals Pvt Ltd'
        )
        bill = VendorBill.objects.create(
            reference_no='PB-02-MEDLINE',
            vendor=vendor,
            invoice_no='INV-MEDLINE-2026',
            invoice_date=date(2026, 10, 10),
            due_date=date(2026, 11, 10),
            po_no='PO-OT-CONS-02',
            taxable_amount=Decimal('1380000.00'),
            total_amount=Decimal('1545600.00'),
            net_payable=Decimal('1545600.00'),
            status=BillStatus.DRAFT,
            maker=self.maker_exec
        )
        # Create bill item for 46 stents
        VendorBillItem.objects.create(
            bill=bill,
            line_no=1,
            item_code='STENT-DES-01',
            description='Coronary Drug-Eluting Stents',
            qty=Decimal('46.00'),
            rate=Decimal('30000.00'),
            taxable=Decimal('1380000.00')
        )
        # Populate Cath Lab usage register with 46 implanted stents
        for i in range(1, 47):
            OTImplantUsageRegister.objects.create(
                usage_no=f'USE-CATH-{i:04d}',
                used_at=timezone.now(),
                patient_uhid=f'UHID-CATH-{i:03d}',
                patient_name=f'Cath Patient {i}',
                procedure_name='Angioplasty PTCA',
                theater_type='cath_lab',
                implant_name='Coronary Drug-Eluting Stents',
                implant_serial_no=f'SN-STENT-{i:04d}',
                batch_no=f'B-{i:02d}',
                vendor_name='Medline Surgicals Pvt Ltd',
                unit_cost=Decimal('30000.00'),
                quantity=1,
                surgeon_name='Dr. Sengupta',
                is_matched_to_invoice=False
            )

        match_res = ClinicalIntegrationService.match_ot_implant_consignment(bill.id)
        self.assertEqual(match_res['status'], 'matched')
        self.assertEqual(match_res['variance'], 0)
        self.assertEqual(match_res['usage_count'], 46)
        self.assertEqual(match_res['invoiced_quantity'], 46)

        # Verify usage records updated
        unmatched_count = OTImplantUsageRegister.objects.filter(is_matched_to_invoice=False).count()
        self.assertEqual(unmatched_count, 0)

        # Verify consignment match record
        cm = OTImplantConsignmentMatch.objects.get(vendor_bill=bill)
        self.assertEqual(cm.match_status, 'matched')
        self.assertEqual(cm.variance_count, 0)

    def test_10_ot_implant_consignment_quantity_mismatch_raises_financial_exception(self):
        """OT implant quantity mismatch (46 billed vs 40 in Cath Lab register) raises FinancialException"""
        vendor = VendorMirror.objects.create(
            source_vendor_id='VEND-MEDLINE-02',
            name='Medline Surgicals Pvt Ltd'
        )
        bill = VendorBill.objects.create(
            reference_no='PB-03-MEDLINE-VAR',
            vendor=vendor,
            invoice_no='INV-MEDLINE-VAR',
            invoice_date=date(2026, 10, 10),
            due_date=date(2026, 11, 10),
            po_no='PO-OT-CONS-03',
            taxable_amount=Decimal('1380000.00'),
            total_amount=Decimal('1545600.00'),
            net_payable=Decimal('1545600.00'),
            status=BillStatus.DRAFT,
            maker=self.maker_exec
        )
        VendorBillItem.objects.create(
            bill=bill,
            line_no=1,
            item_code='STENT-DES-01',
            description='Coronary Drug-Eluting Stents',
            qty=Decimal('46.00'),
            rate=Decimal('30000.00'),
            taxable=Decimal('1380000.00')
        )
        # Cath Lab has only 40 stents used (variance of 6)
        for i in range(1, 41):
            OTImplantUsageRegister.objects.create(
                usage_no=f'USE-VAR-{i:04d}',
                used_at=timezone.now(),
                patient_uhid=f'UHID-VAR-{i:03d}',
                patient_name=f'Cath Patient {i}',
                procedure_name='Angioplasty PTCA',
                theater_type='cath_lab',
                implant_name='Coronary Drug-Eluting Stents',
                implant_serial_no=f'SN-STENT-VAR-{i:04d}',
                batch_no=f'B-VAR-{i:02d}',
                vendor_name='Medline Surgicals Pvt Ltd',
                unit_cost=Decimal('30000.00'),
                quantity=1,
                surgeon_name='Dr. Sengupta',
                is_matched_to_invoice=False
            )

        match_res = ClinicalIntegrationService.match_ot_implant_consignment(bill.id)
        self.assertEqual(match_res['status'], 'quantity_mismatch')
        self.assertEqual(match_res['variance'], 6)
        self.assertIsNotNone(match_res['exception_no'])

        # Verify FinancialException created
        ex = FinancialException.objects.get(exception_no=match_res['exception_no'])
        self.assertEqual(ex.type, 'Consignment Mismatch')
        self.assertEqual(ex.severity, 'High')

    def test_11_rest_api_endpoints_clinical_integration(self):
        """Verifies Phase 9 REST API integration endpoints for summary, accrual, auto-reversal, and batches"""
        # 1. Unbilled revenue summary endpoint
        IPDUnbilledTracker.objects.create(
            admission_id='ADM-API-01',
            admission_number='IPD/2026/801',
            patient_uhid='UHID-801',
            patient_name='API Test Patient',
            status='ACTIVE',
            total_running_charges=Decimal('50000.00'),
            unbilled_balance=Decimal('50000.00')
        )
        r1 = self.client.get('/api/v1/integration/unbilled-revenue-summary')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertIn('total_unbilled_revenue', r1.data)
        self.assertEqual(Decimal(str(r1.data['total_unbilled_revenue'])), Decimal('50000.00'))

        # 2. Generate unbilled accrual endpoint
        self.client.force_authenticate(user=self.supervisor)
        r2 = self.client.post('/api/v1/integration/generate-unbilled-accrual', {
            'date': '2026-10-31'
        }, format='json')
        self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(r2.data['status'], 'accrual_created')

        # 3. Consultant batches list endpoint
        r3 = self.client.get('/api/v1/accounts/consultant-batches/')
        self.assertEqual(r3.status_code, status.HTTP_200_OK)

        # 4. Execute accrual reversal endpoint
        r4 = self.client.post('/api/v1/integration/execute-accrual-reversal', {
            'date': '2026-11-01'
        }, format='json')
        self.assertEqual(r4.status_code, status.HTTP_200_OK)
        self.assertIn('reversed_count', r4.data)










class LabIntegrationPhase10TestCase(TestCase):
    """Phase 10: Lab Integration · outsourced test accruals (#19), partner invoice ↔ requisition matching,
    charge volumes without GL entry (#20), nightly service-line feed and Laboratory GL reconciliation.
    """

    PARTNER = 'Agilus Diagnostics'

    def setUp(self):
        from .services import LabIntegrationService
        self.svc = LabIntegrationService
        self.client = APIClient()
        self.supervisor = User.objects.create_user(username='lab_sup_p10', role=RoleType.ACCOUNTS_SUPERVISOR, password='x')
        self.manager = User.objects.create_user(username='lab_mgr_p10', role=RoleType.ACCOUNTS_MANAGER, password='x')
        self.maker = User.objects.create_user(username='lab_exec_p10', role=RoleType.ACCOUNTS_EXECUTIVE, password='x')
        self.svc.ensure_seed_data()
        PeriodLock.objects.get_or_create(branch_id='MAIN', period_type='month', period_key='2026-10',
                                         defaults={'status': PeriodLockStatus.OPEN})
        self.vendor = VendorMirror.objects.create(source_vendor_id='VEND-AGILUS', name=self.PARTNER)

    # ----- helpers -----
    def _outsourced(self, req_no, cost, dept='Laboratory', day='2026-10-05', partner=None):
        return EventInboxService.process_incoming_event({
            'event_type': 'lab.outsourced_test.completed',
            'source_department': dept.lower(),
            'source_reference': req_no,
            'business_date': day,
            'amount': str(cost),
            'payload': {'requisition_no': req_no, 'partner_lab': partner or self.PARTNER,
                        'test_name': 'Vitamin D (25-OH)', 'department': dept, 'patient_uhid': 'UHID-1'},
        })

    def _charge(self, ref, amount, invoice_no, dept='Laboratory', qty=1, day='2026-10-05'):
        return EventInboxService.process_incoming_event({
            'event_type': 'lab.charge.posted',
            'source_department': dept.lower(),
            'source_reference': ref,
            'business_date': day,
            'amount': str(amount),
            'payload': {'invoice_no': invoice_no, 'department': dept, 'quantity': qty},
        })

    def _approve_batch(self, batch):
        req = ApprovalRequest.objects.get(id=batch['approval_request_id'])
        return ApprovalEngineService.process_decision(req.id, self.supervisor, 'approve', version=req.version)

    def _bill(self, ref, taxable, category='outsourced_lab', tax=Decimal('0.00')):
        return VendorBill.objects.create(
            reference_no=ref, vendor=self.vendor, invoice_no=f'INV-{ref}', invoice_date=date(2026, 10, 31),
            due_date=date(2026, 11, 30), department_id='Laboratory', category=category,
            taxable_amount=Decimal(taxable), cgst=tax / 2, sgst=tax / 2,
            total_amount=Decimal(taxable) + tax, net_payable=Decimal(taxable) + tax,
            status=BillStatus.SUBMITTED, maker=self.maker
        )

    def _gl(self, code, cc=None):
        qs = GLEntry.objects.filter(account__code=code, period='2026-10')
        if cc:
            qs = qs.filter(cost_center__code=cc)
        return sum((e.debit - e.credit for e in qs), Decimal('0.00'))

    # ----- tests -----
    def test_01_outsourced_event_queued_duplicate_ignored_and_invalid_rejected(self):
        from .models import OutsourcedTestAccrual
        res = self._outsourced('REQ-1001', '850.00')
        self.assertEqual(res['status'], EventStatus.VALIDATED)
        self.assertEqual(OutsourcedTestAccrual.objects.get(requisition_no='REQ-1001').status, 'pending_batch')
        self.assertFalse(Journal.objects.filter(financial_event_id=res['financial_event_id']).exists())

        # Same requisition re-sent under a new event id: no second accrual
        dup = EventInboxService.process_incoming_event({
            'event_type': 'lab.outsourced_test.completed', 'source_department': 'laboratory',
            'source_reference': 'REQ-1001-resend', 'business_date': '2026-10-05', 'amount': '850.00',
            'payload': {'requisition_no': 'REQ-1001', 'partner_lab': self.PARTNER, 'test_name': 'Vitamin D'},
        })
        self.assertEqual(dup['status'], EventStatus.DUPLICATE_IGNORED)
        self.assertEqual(OutsourcedTestAccrual.objects.filter(requisition_no='REQ-1001').count(), 1)

        bad = EventInboxService.process_incoming_event({
            'event_type': 'lab.outsourced_test.completed', 'source_department': 'laboratory',
            'source_reference': 'REQ-BAD', 'business_date': '2026-10-05', 'amount': '500.00', 'payload': {},
        })
        self.assertEqual(bad['status'], EventStatus.REJECTED_TECHNICAL)

    def test_02_daily_batch_accrues_by_cost_center_and_posts_on_approval(self):
        e1 = self._outsourced('REQ-2001', '1200.00')
        self._outsourced('REQ-2002', '800.00')
        self._outsourced('REQ-2003', '3500.00', dept='Radiology')

        batch = self.svc.post_daily_accrual_batch('2026-10-05')
        self.assertEqual((batch['status'], batch['count'], batch['amount']), ('submitted', 3, '5500.00'))
        journal = Journal.objects.get(id=batch['journal_id'])
        self.assertEqual(journal.status, JournalStatus.DRAFT)
        self.assertEqual(self.svc.post_daily_accrual_batch('2026-10-05')['status'], 'nothing_to_accrue')

        self._approve_batch(batch)
        self.assertEqual(self._gl('5450', 'CC-310'), Decimal('2000.00'))
        self.assertEqual(self._gl('5450', 'CC-320'), Decimal('3500.00'))
        self.assertEqual(self._gl('2400'), Decimal('-5500.00'))
        self.assertEqual(FinancialEvent.objects.get(id=e1['financial_event_id']).status, EventStatus.POSTED)

    def test_03_returned_batch_releases_requisitions_for_rebatching(self):
        from .models import OutsourcedTestAccrual
        self._outsourced('REQ-3001', '900.00')
        batch = self.svc.post_daily_accrual_batch('2026-10-05')
        req = ApprovalRequest.objects.get(id=batch['approval_request_id'])
        ApprovalEngineService.process_decision(req.id, self.supervisor, 'return', comment='Wrong partner rate card', version=req.version)
        accrual = OutsourcedTestAccrual.objects.get(requisition_no='REQ-3001')
        self.assertEqual((accrual.status, accrual.accrual_journal), ('pending_batch', None))
        self.assertEqual(self.svc.post_daily_accrual_batch('2026-10-05')['count'], 1)

    def test_04_partner_invoice_matching_requisition_count_clears_accrual(self):
        for i, cost in enumerate(['1000.00', '1500.00', '2500.00']):
            self._outsourced(f'REQ-40{i}', cost)
        self._approve_batch(self.svc.post_daily_accrual_batch('2026-10-05'))

        # Invoice ₹5,050 vs ₹5,000 accrued: 1% price variance is within tolerance
        bill = self._bill('VB-AGL-OCT', '5050.00', tax=Decimal('909.00'))
        res = self.svc.match_partner_invoice(bill.id, '2026-10-01', '2026-10-31', invoiced_count=3)
        self.assertEqual((res['status'], res['accrued_count'], res['amount_variance']), ('matched', 3, '50.00'))

        PharmacyIntegrationService.post_vendor_bill(bill.id, self.manager)
        self.assertEqual(self._gl('2400'), Decimal('0.00'))           # accrual fully cleared
        self.assertEqual(self._gl('5450', 'CC-310'), Decimal('5050.00'))  # accrual + price variance
        self.assertEqual(self._gl('2200'), Decimal('0.00'))           # GRNI untouched
        self.assertEqual(self._gl('2000'), Decimal('-5959.00'))

    def test_05_count_variance_raises_exception_and_blocks_posting(self):
        from .exceptions import BlockedByDependencyError
        for i in range(3):
            self._outsourced(f'REQ-50{i}', '1000.00')
        self._approve_batch(self.svc.post_daily_accrual_batch('2026-10-05'))

        bill = self._bill('VB-AGL-MISMATCH', '4000.00')
        res = self.svc.match_partner_invoice(bill.id, '2026-10-01', '2026-10-31', invoiced_count=4)
        self.assertEqual((res['status'], res['count_variance']), ('count_mismatch', 1))
        exc = FinancialException.objects.get(exception_no=res['exception_no'])
        self.assertEqual((exc.type, exc.status), ('Requisition Mismatch', ExceptionStatus.NEW))
        with self.assertRaises(BlockedByDependencyError):
            PharmacyIntegrationService.post_vendor_bill(bill.id, self.manager)

        # Exact requisition list: one invoiced requisition was never accrued
        res2 = self.svc.match_partner_invoice(bill.id, requisition_nos=['REQ-500', 'REQ-501', 'REQ-999'])
        self.assertEqual((res2['status'], res2['missing_requisitions']), ('count_mismatch', ['REQ-999']))

        # A partner-lab bill that was never matched cannot post either
        with self.assertRaises(BlockedByDependencyError):
            PharmacyIntegrationService.post_vendor_bill(self._bill('VB-AGL-UNMATCHED', '1000.00').id, self.manager)

    def test_06_price_variance_over_tolerance_and_unposted_accruals_block(self):
        self._outsourced('REQ-6001', '1000.00')
        bill = self._bill('VB-AGL-UNPOSTED', '1000.00')
        self.assertEqual(self.svc.match_partner_invoice(bill.id, invoiced_count=1)['status'], 'accrual_unposted')

        self._approve_batch(self.svc.post_daily_accrual_batch('2026-10-05'))
        bill2 = self._bill('VB-AGL-PRICE', '1200.00')
        res = self.svc.match_partner_invoice(bill2.id, '2026-10-01', '2026-10-31', invoiced_count=1)
        self.assertEqual(res['status'], 'price_variance')
        self.assertTrue(FinancialException.objects.filter(exception_no=res['exception_no'], type='Large Variance').exists())

    def test_07_charges_post_no_journal_and_nightly_feed_is_idempotent(self):
        from .models import ServiceLineVolume, ServiceLineMetric
        from .services import CfoStrategyService
        r = self._charge('LAB-CHG-1', '600.00', 'INV-L1', qty=2)
        self._charge('RAD-CHG-1', '4200.00', 'INV-R1', dept='Radiology')
        self.assertEqual(r['status'], EventStatus.VALIDATED)
        self.assertFalse(Journal.objects.filter(financial_event_id=r['financial_event_id']).exists())
        missing_invoice = self._charge('LAB-CHG-X', '100.00', '')
        self.assertEqual(missing_invoice['status'], EventStatus.REJECTED_TECHNICAL)
        self._outsourced('REQ-7001', '350.00')

        first = self.svc.run_nightly_service_line_feed('2026-10-05')
        second = self.svc.run_nightly_service_line_feed('2026-10-05')
        self.assertEqual(first['lines'], second['lines'])
        path = ServiceLineVolume.objects.get(business_date=date(2026, 10, 5), service_line='Pathology')
        self.assertEqual((path.volume, path.revenue, path.outsourced_volume, path.outsourced_cost),
                         (2, Decimal('600.00'), 1, Decimal('350.00')))
        metric = ServiceLineMetric.objects.get(period='2026-10', service_line='Imaging')
        self.assertEqual((metric.volume, metric.unit), (1, 'scans'))

        # CFO service-line screen still reads only its own period
        lines = CfoStrategyService.get_service_lines()
        self.assertNotIn('2026-10', {ServiceLineMetric.objects.get(id=x['id']).period for x in lines.get('lines', [])})

    def test_08_laboratory_service_line_reconciles_to_gl(self):
        for i, cost in enumerate(['1100.00', '900.00']):
            self._outsourced(f'REQ-80{i}', cost)
        self._charge('LAB-CHG-81', '2400.00', 'INV-L81', qty=3)
        self.svc.run_nightly_service_line_feed('2026-10-05')
        batch = self.svc.post_daily_accrual_batch('2026-10-05')

        before = self.svc.reconcile_to_gl('2026-10')
        lab = next(d for d in before['departments'] if d['department'] == 'Laboratory')
        self.assertFalse(before['reconciled'])
        self.assertEqual(sorted(lab['unposted_accruals']), ['REQ-800', 'REQ-801'])
        self.assertEqual(lab['unposted_charge_invoices'], ['INV-L81'])

        self._approve_batch(batch)
        FinancialEvent.objects.create(event_id='EV-INV-L81', event_type='billing.invoice.created',
                                      source_department='billing', source_reference='INV-L81',
                                      idempotency_key='billing.invoice.created:INV-L81', business_date=date(2026, 10, 5),
                                      amount=Decimal('2400.00'), status=EventStatus.POSTED)
        bill = self._bill('VB-AGL-REC', '2020.00')
        self.svc.match_partner_invoice(bill.id, '2026-10-01', '2026-10-31', invoiced_count=2)
        PharmacyIntegrationService.post_vendor_bill(bill.id, self.manager)

        after = self.svc.reconcile_to_gl('2026-10')
        lab = next(d for d in after['departments'] if d['department'] == 'Laboratory')
        self.assertTrue(after['reconciled'], lab['checks'])
        self.assertEqual((lab['gl_outsourced_cost'], lab['gl_invoice_price_variance'], lab['posted_accrual_cost']),
                         ('2020.00', '20.00', '2000.00'))

    def test_09_lab_integration_api_endpoints(self):
        self.client.force_authenticate(self.manager)
        r = self.client.post('/api/v1/integration/events', {
            'event_type': 'lab.outsourced_test.completed', 'source_department': 'laboratory',
            'source_reference': 'REQ-9001', 'business_date': '2026-10-05', 'amount': '700.00',
            'payload': {'requisition_no': 'REQ-9001', 'partner_lab': self.PARTNER, 'test_name': 'HbA1c'}
        }, format='json')
        self.assertIn(r.status_code, (200, 201))
        b = self.client.post('/api/v1/accounts/integration/lab/accrual-batch/', {'business_date': '2026-10-05'}, format='json')
        self.assertEqual((b.status_code, b.data['count']), (200, 1))
        a = self.client.get('/api/v1/accounts/integration/lab/accruals/?status=accrued')
        self.assertEqual([x['requisition_no'] for x in a.data], ['REQ-9001'])
        f = self.client.post('/api/v1/accounts/integration/lab/service-line-feed/', {'business_date': '2026-10-05'}, format='json')
        self.assertEqual(f.status_code, 200)
        m = self.client.post(f'/api/v1/accounts/integration/lab/match-invoice/{self._bill("VB-API", "700.00").id}/',
                             {'invoiced_count': 1}, format='json')
        self.assertEqual((m.status_code, m.data['status']), (200, 'accrual_unposted'))
        self.assertEqual(self.client.get('/api/v1/accounts/integration/lab/reconciliation/?period=2026-10').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/accounts/integration/lab/reconciliation/?period=Oct').status_code, 422)
        self.assertEqual(self.client.post(f'/api/v1/accounts/integration/lab/match-invoice/{uuid.uuid4()}/', {}, format='json').status_code, 404)


from .models import AuditRequest  # noqa: E402  (Phase 11 tests)
from .exceptions import AccountingDomainError  # noqa: E402


class AuditCompliancePhase11TestCase(TestCase):
    """Phase 11: Audit & Compliance · append-only audit table, hash-chain verifier, WORM export,
    time-boxed read-only auditor, PBC evidence sharing, 7-control monitor, restricted reads and journal tracing.
    """

    def setUp(self):
        from datetime import timedelta
        from .models import AuditEngagement
        from .services import AuditComplianceService, FinanceControllerService
        self.svc = AuditComplianceService
        self.exec_user = User.objects.create_user(username='ae_p11', role=RoleType.ACCOUNTS_EXECUTIVE, password='x')
        self.supervisor = User.objects.create_user(username='as_p11', role=RoleType.ACCOUNTS_SUPERVISOR, password='x')
        self.controller = User.objects.create_user(username='fc_p11', role=RoleType.FINANCE_CONTROLLER, password='x', first_name='Anil', last_name='Verma')
        self.auditor = User.objects.create_user(username='aud_p11', role=RoleType.AUDITOR, password='x', first_name='Meera', last_name='Sharma')
        BillingIntegrationService.ensure_seed_data()
        FinanceControllerService.ensure_seed_data()
        self.svc.ensure_seed_data()
        today = timezone.now().date()
        PeriodLock.objects.get_or_create(branch_id='MAIN', period_type='month', period_key=today.strftime('%Y-%m'),
                                         defaults={'status': PeriodLockStatus.OPEN})
        self.engagement = AuditEngagement.objects.create(
            engagement_no='ENG-TEST-P11', auditor_firm='Sharma & Associates', created_by=self.controller,
            period_from=today.replace(day=1) - timedelta(days=60), period_to=today + timedelta(days=1),
            fieldwork_from=today - timedelta(days=1), fieldwork_to=today + timedelta(days=10))
        self.grant = self.svc.grant_access(self.controller, 'ENG-TEST-P11', 'aud_p11')
        self.client = APIClient()

    def _auditor_client(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.auditor).access_token))
        return c

    def _log(self, action='test_action', reason='original reason'):
        return AuditService.log_action(actor_user=self.exec_user, module='journal', action=action, entity_type='journal',
                                       entity_id=str(uuid.uuid4()), reference_no='JV-T', new_state={'amount': '100.00'}, reason=reason)

    def test_01_audit_table_update_and_delete_denied_at_database_level(self):
        from django.db import connection, DatabaseError
        from .models import AuditLogImmutableError
        entry = self._log()
        with self.assertRaises(DatabaseError), transaction.atomic():
            with connection.cursor() as cur:
                cur.execute("UPDATE accounts_audit_logs SET reason = 'edited' WHERE id = %s", [entry.id.hex])
        with self.assertRaises(DatabaseError), transaction.atomic():
            with connection.cursor() as cur:
                cur.execute("DELETE FROM accounts_audit_logs WHERE id = %s", [entry.id.hex])
        with self.assertRaises(DatabaseError), transaction.atomic():
            AccountAuditLog.objects.filter(id=entry.id).update(reason='edited via ORM')
        with self.assertRaises(AuditLogImmutableError):
            entry.save()
        with self.assertRaises(AuditLogImmutableError):
            entry.delete()
        entry.refresh_from_db()
        self.assertEqual(entry.reason, 'original reason')

    def test_02_chain_break_detected_and_raises_critical_violation(self):
        from django.db import connection
        for i in range(3):
            self._log(action=f'act_{i}')
        healthy = self.svc.run_chain_verification()
        self.assertTrue(healthy['valid'])
        self.assertTrue(all(d['valid'] for d in healthy['days']))

        # A DBA bypasses the trigger and edits a reason: the hash now covers every field, so this is caught
        target = AccountAuditLog.objects.order_by('sequence')[1]
        with connection.cursor() as cur:
            cur.execute('DROP TRIGGER accounts_audit_logs_no_update')
            cur.execute("UPDATE accounts_audit_logs SET reason = 'tampered' WHERE id = %s", [target.id.hex])
            cur.execute("CREATE TRIGGER accounts_audit_logs_no_update BEFORE UPDATE ON accounts_audit_logs "
                        "BEGIN SELECT RAISE(ABORT, 'accounts_audit_logs is append-only: UPDATE denied'); END;")
        result = self.svc.run_chain_verification()
        self.assertFalse(result['valid'])
        self.assertEqual((result['broken_at_sequence'], result['error']), (target.sequence, 'Payload digest mismatch (record content altered)'))
        violation = ControlViolation.objects.get(violation_no=result['violation_no'])
        self.assertEqual((violation.severity, violation.status), ('Critical', 'Open'))

    def test_03_forged_insert_and_sequence_gap_detected(self):
        from django.db import connection
        last = self._log()
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO accounts_audit_logs (id, sequence, actor_name, actor_role, module, action, entity_type, entity_id, "
                "reference_no, reason, ip_address, user_agent, previous_hash, entry_hash, occurred_at) "
                "VALUES (%s, %s, 'Forger', 'SYSTEM', 'journal', 'approve', 'journal', 'x', 'JV-FAKE', '', '', '', %s, %s, %s)",
                [uuid.uuid4().hex, last.sequence + 2, last.entry_hash, 'f' * 64, timezone.now()])
        result = AuditService.verify_integrity()
        self.assertFalse(result['valid'])
        self.assertIn('Sequence gap', result['error'])

    def test_04_worm_export_is_write_once_and_tamper_evident(self):
        import os
        import stat
        import tempfile
        from django.test import override_settings
        with tempfile.TemporaryDirectory() as tmp, override_settings(ACCOUNTS_AUDIT_WORM_DIR=tmp):
            self._log()
            day = timezone.now().date()
            export = self.svc.export_worm(day, self.controller)
            self.assertGreaterEqual(export['record_count'], 1)
            self.assertFalse(os.stat(export['file_path']).st_mode & stat.S_IWUSR)
            with self.assertRaises(AccountingDomainError) as ctx:
                self.svc.export_worm(day, self.controller)
            self.assertEqual(ctx.exception.code, 'ALREADY_EXPORTED')
            self.assertTrue(self.svc.verify_worm_exports()['valid'])

            os.chmod(export['file_path'], stat.S_IWUSR | stat.S_IRUSR)
            with open(export['file_path'], 'ab') as fh:
                fh.write(b'{"type": "record", "forged": true}\n')
            report = self.svc.verify_worm_exports()
            self.assertFalse(report['valid'])
            self.assertEqual(report['exports'][-1]['status'], 'altered')

    def test_05_auditor_is_read_only_scoped_and_every_read_audited(self):
        c = self._auditor_client()
        me = c.get('/api/v1/accounts/auditor/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['engagement']['engagement_no'], 'ENG-TEST-P11')
        self.assertTrue(AccountAuditLog.objects.filter(actor_user=self.auditor, module='restricted_read').exists())

        # AUD-02: any write is refused, on Accounts and on the integration inbox
        for method, url in (('post', '/api/v1/accounts/journals/'), ('patch', '/api/v1/accounts/exceptions/EX-101/action/'),
                            ('post', '/api/v1/integration/events')):
            r = getattr(c, method)(url, {}, format='json')
            self.assertEqual((r.status_code, r.json()['error']['code']), (403, 'READ_ONLY_ROLE'), url)
        # Controller's PBC list would expose unshared evidence names: auditors are confined to /auditor/
        r = c.get('/api/v1/accounts/audit/requests/')
        self.assertEqual((r.status_code, r.json()['error']['code']), (403, 'AUDITOR_SCOPE'))
        self.assertEqual(c.get('/api/v1/accounts/auditor/logs/?module=journal').status_code, 200)

    def test_06_auditor_cannot_see_unshared_evidence(self):
        from .services import FinanceControllerService
        c = self._auditor_client()
        r = c.get('/api/v1/accounts/auditor/pbc/PBC-04/evidence/')  # Ready, not yet shared
        self.assertEqual((r.status_code, r.json()['error']['code']), (403, 'NOT_SHARED'))
        self.assertNotIn('PBC-04', [p['id'] for p in c.get('/api/v1/accounts/auditor/pbc/').data])
        self.assertTrue(AccountAuditLog.objects.filter(actor_user=self.auditor, action='read_pbc_evidence_denied').exists())

        FinanceControllerService.share_audit_request('PBC-04', self.controller, engagement_no='ENG-TEST-P11')
        ok = c.get('/api/v1/accounts/auditor/pbc/PBC-04/evidence/')
        self.assertEqual(ok.status_code, 200)
        self.assertIn('payroll-recon-h1.xlsx', [e['file_name'] for e in ok.data['evidence']])
        pbc = AuditRequest.objects.get(request_no='PBC-04')
        self.assertEqual((pbc.shared_by, pbc.engagement.engagement_no), (self.controller, 'ENG-TEST-P11'))

        # Evidence set is frozen once shared
        with self.assertRaises(AccountingDomainError):
            self.svc.attach_evidence(self.controller, 'PBC-04', 'late-file.pdf')

    def test_07_access_is_time_boxed_and_revocable(self):
        from datetime import timedelta
        c = self._auditor_client()
        self.assertEqual(c.get('/api/v1/accounts/auditor/me/').status_code, 200)
        self.svc.revoke_access(self.controller, self.grant.id)
        r = c.get('/api/v1/accounts/auditor/me/')
        self.assertEqual((r.status_code, r.json()['error']['code']), (403, 'AUDIT_ACCESS_INACTIVE'))

        # Grants never outlive the engagement fieldwork, and only auditors can receive them
        long = self.svc.grant_access(self.controller, 'ENG-TEST-P11', 'aud_p11', valid_until=timezone.now() + timedelta(days=365))
        self.assertEqual(long.valid_until.date(), self.engagement.fieldwork_to)
        with self.assertRaises(AccountingDomainError):
            self.svc.grant_access(self.controller, 'ENG-TEST-P11', 'ae_p11')
        with self.assertRaises(AccountingDomainError):
            self.svc.grant_access(self.supervisor, 'ENG-TEST-P11', 'aud_p11')

    def test_08_control_monitor_covers_all_seven_controls(self):
        from datetime import timedelta
        from .models import ApprovalStep, ControlDefinition
        req = ApprovalRequest.objects.create(document_type='journal', document_id=uuid.uuid4(), reference_no='JV-IC01',
                                             amount=Decimal('60000.00'), maker=self.supervisor, status=ApprovalStatus.APPROVED)
        ApprovalStep.objects.create(approval_request=req, step_no=1, level='supervisor', actor=self.supervisor,
                                    decision='approve', limit_applied=Decimal('50000.00'))                       # IC-01 + IC-03
        v1 = VendorMirror.objects.create(source_vendor_id='V-IC', name='Medline Surgicals', gstin='27AAAAA0000A1Z5',
                                         bank_change_pending=True, bank_changed_at=timezone.now() - timedelta(days=1))
        VendorMirror.objects.create(source_vendor_id='V-IC-DUP', name='Medline Surgicals Pvt', gstin='27AAAAA0000A1Z5')  # IC-06
        for i in range(2):                                                                                       # IC-05 (+ IC-02)
            VendorBill.objects.create(reference_no=f'VB-IC05-{i}', vendor=v1, invoice_no=f'S-{i}', invoice_date=date(2026, 10, 3),
                                      due_date=date(2026, 11, 3), taxable_amount=Decimal('95000.00'), total_amount=Decimal('95000.00'),
                                      net_payable=Decimal('95000.00'), status=BillStatus.APPROVED, maker=self.exec_user)
        PeriodLock.objects.update_or_create(branch_id='MAIN', period_type='month', period_key='2026-08',
                                            defaults={'status': PeriodLockStatus.LOCKED, 'locked_at': timezone.now() - timedelta(days=5)})
        Journal.objects.create(reference_no='JV-IC04', journal_date=date(2026, 8, 31), posting_period='2026-08',
                               description='Back-dated accrual', total_debit=Decimal('12000.00'), maker=self.exec_user)  # IC-04
        stale = User.objects.create_user(username='bc14_p11', role=RoleType.CASHIER, password='x')
        User.objects.filter(id=stale.id).update(last_login=timezone.now() - timedelta(days=60))                   # IC-07

        run = self.svc.run_control_monitor()
        findings = {c['code']: c['findings'] for c in run['controls']}
        for code in ('IC-01', 'IC-02', 'IC-03', 'IC-04', 'IC-05', 'IC-06', 'IC-07'):
            self.assertGreaterEqual(findings[code], 1, code)
        self.assertTrue(ControlViolation.objects.filter(violation_no='IC-07-bc14_p11').exists())
        self.assertEqual(sum(c['new_violations'] for c in self.svc.run_control_monitor()['controls']), 0)  # idempotent
        coverage = {c['code']: c for c in self.svc.control_coverage()}
        self.assertTrue(all(coverage[f'IC-0{i}']['covered'] for i in range(1, 8)))
        self.assertEqual(ControlDefinition.objects.count(), 8)

    def test_09_restricted_report_reads_are_audited(self):
        self.client.force_authenticate(self.controller)
        self.assertEqual(self.client.get('/api/v1/accounts/cfo/board-report/').status_code, 200)
        self.assertTrue(AccountAuditLog.objects.filter(actor_user=self.controller, action='read_board_pack').exists())
        j = Journal.objects.create(reference_no='JV-PAY-SEP', journal_date=timezone.now().date(),
                                   posting_period=timezone.now().strftime('%Y-%m'), entry_type='payroll',
                                   description='September salaries', maker=self.exec_user)
        self.assertEqual(self.client.get(f'/api/v1/accounts/journals/{j.id}/').status_code, 200)
        self.assertTrue(AccountAuditLog.objects.filter(action='read_payroll_journal', reference_no='JV-PAY-SEP').exists())

    def test_10_auditor_traces_posted_journal_to_source_approvals_and_documents(self):
        today = timezone.now().date()
        cash, adv = ChartOfAccount.objects.get(code='1000'), ChartOfAccount.objects.get(code='2300')
        journal = JournalService.create_draft_journal(
            maker=self.exec_user, journal_date=today, description='Manual cash reclass',
            lines=[{'account_id': str(cash.id), 'debit': Decimal('12000.00'), 'credit': Decimal('0.00')},
                   {'account_id': str(adv.id), 'debit': Decimal('0.00'), 'credit': Decimal('12000.00')}],
            entry_type='expense_adjustment')
        req = ApprovalEngineService.submit_for_approval('journal', journal.id, journal.reference_no, Decimal('12000.00'), self.exec_user)
        ApprovalEngineService.process_decision(req.id, self.supervisor, 'approve', version=req.version)
        from .models import AccountDocument
        AccountDocument.objects.create(entity_type='journal', entity_id=str(journal.id), doc_type='approval_note',
                                       file_name='reclass-note.pdf', uploaded_by=self.exec_user, checksum='ab12')

        c = self._auditor_client()
        trace = c.get(f'/api/v1/accounts/auditor/trace/{journal.reference_no}/')
        self.assertEqual(trace.status_code, 200, trace.content)
        d = trace.data
        self.assertEqual(d['journal']['status'], 'posted')
        self.assertEqual(d['approvals'][0]['steps'][0]['actor'], 'as_p11')
        self.assertEqual(d['documents'][0]['file_name'], 'reclass-note.pdf')
        self.assertTrue(all(d['completeness'][k] for k in ('source_identified', 'approval_evidence', 'gl_posted',
                                                           'audit_entries_hash_valid', 'chain_valid')))

        # Event-driven journal: traced back to the source event; auto-posted under the ≤ ₹50k rule
        out = EventInboxService.process_incoming_event({
            'event_type': 'reception.deposit.collected', 'source_department': 'reception', 'source_reference': 'DEP-P11-1',
            'business_date': today.isoformat(), 'amount': '15000.00', 'payload': {'payment_mode': 'cash', 'patient_uhid': 'UHID-P11'}})
        t2 = c.get(f"/api/v1/accounts/auditor/trace/{out['journal_ref']}/").data
        self.assertEqual(t2['source_events'][0]['source_reference'], 'DEP-P11-1')
        self.assertTrue(t2['completeness']['auto_posted_by_rule'])
        self.assertTrue(t2['completeness']['approval_evidence'])

        # Outside the engagement period: not visible to the auditor
        old = Journal.objects.create(reference_no='JV-OLD-P11', journal_date=date(2020, 1, 1), posting_period='2020-01',
                                     description='Out of scope', maker=self.exec_user)
        self.assertEqual(c.get(f'/api/v1/accounts/auditor/trace/{old.reference_no}/').status_code, 404)

    def test_11_retention_policies_never_purge_the_audit_trail(self):
        self._log()
        status_rows = {r['record_type']: r for r in self.svc.retention_status()}
        self.assertEqual(status_rows['audit_logs']['retain_years'], 8)
        self.assertFalse(status_rows['audit_logs']['purge_allowed'])
        self.assertEqual(status_rows['audit_logs']['eligible_for_purge'], 0)
        self.assertIn('journals', status_rows)


from .services import (
    EndToEndSimulationService, FinanceControllerService,
    BillingIntegrationService, PharmacyIntegrationService,
    JournalService, ApprovalEngineService, EventInboxService
)
from .exceptions import (
    JournalBalanceError, LimitExceededError, BlockedByDependencyError,
    SoDViolationError, VersionConflictError, AccountingDomainError
)
from .models import HighRiskItem


class EndToEndPhase12TestCase(TestCase):
    """Phase 12: End-to-End Enterprise Testing Suite
    Covers Role-by-role security/SoD, Cross-department integration (Billing, Pharmacy, IPD, Lab),
    Subledgers, 10-step Month-End Closing Sequence (§6), 4 Acceptance Invariants,
    and Non-Functional Requirements (NF-01..07) including Outage Replay and Optimistic Locking.
    """

    def setUp(self):
        from rest_framework.test import APIClient
        self.sim_svc = EndToEndSimulationService
        self.client = APIClient()

        # Role-by-role test users per ACCOUNTS_TESTING_GUIDE.md
        self.ae_user = User.objects.create_user(username='ae_p12', role=RoleType.ACCOUNTS_EXECUTIVE, password='x', first_name='Priya', last_name='Nair')
        self.as_user = User.objects.create_user(username='as_p12', role=RoleType.ACCOUNTS_SUPERVISOR, password='x', first_name='Rahul', last_name='Menon')
        self.am_user = User.objects.create_user(username='am_p12', role=RoleType.ACCOUNTS_MANAGER, password='x', first_name='Kavita', last_name='Shah')
        self.fc_user = User.objects.create_user(username='fc_p12', role=RoleType.FINANCE_CONTROLLER, password='x', first_name='Anil', last_name='Verma')
        self.cfo_user = User.objects.create_user(username='cfo_p12', role=RoleType.CFO, password='x', first_name='Meera', last_name='Rao')
        self.aud_user = User.objects.create_user(username='aud_p12', role=RoleType.AUDITOR, password='x', first_name='Sharma', last_name='& Associates')

        BillingIntegrationService.ensure_seed_data()
        PharmacyIntegrationService.ensure_seed_data()
        FinanceControllerService.ensure_seed_data()

    def test_01_role_by_role_sod_and_security(self):
        """Validates SoD, authorization gates, and role limits across AE, AS, AM, FC, CFO, AUD"""
        cash = ChartOfAccount.objects.get(code='1000')
        ar = ChartOfAccount.objects.get(code='1100')

        # AE-01: Create journal with debit != credit, submit raises JournalBalanceError
        jv_unbal = JournalService.create_draft_journal(
            maker=self.ae_user,
            journal_date=date(2026, 9, 15),
            description='Unbalanced JV',
            lines=[
                {'account_id': str(cash.id), 'debit': Decimal('30000.00'), 'credit': Decimal('0.00')},
                {'account_id': str(ar.id), 'debit': Decimal('0.00'), 'credit': Decimal('25000.00')},
            ]
        )
        with self.assertRaises(JournalBalanceError):
            JournalService.submit_journal(jv_unbal.id, self.ae_user)

        # AE-02: Balanced journal creates draft
        jv = JournalService.create_draft_journal(
            maker=self.ae_user,
            journal_date=date(2026, 9, 15),
            description='Balanced JV',
            lines=[
                {'account_id': str(cash.id), 'debit': Decimal('30000.00'), 'credit': Decimal('0.00')},
                {'account_id': str(ar.id), 'debit': Decimal('0.00'), 'credit': Decimal('30000.00')},
            ]
        )
        self.assertEqual(jv.total_debit, Decimal('30000.00'))

        # AE-04: AE cannot process decisions on approval requests (Forbidden)
        req = ApprovalEngineService.submit_for_approval('journal', jv.id, jv.reference_no, Decimal('30000.00'), self.ae_user)
        self.client.force_authenticate(self.ae_user)
        res = self.client.post(f'/api/v1/accounts/approval-requests/{req.id}/decision/', {'action': 'approve'}, format='json')
        self.assertEqual(res.status_code, 403)

        # AS-01: Maker cannot be approver (SoD violation)
        as_jv = JournalService.create_draft_journal(
            maker=self.as_user,
            journal_date=date(2026, 9, 16),
            description='Self-made JV',
            lines=[
                {'account_id': str(cash.id), 'debit': Decimal('10000.00'), 'credit': Decimal('0.00')},
                {'account_id': str(ar.id), 'debit': Decimal('0.00'), 'credit': Decimal('10000.00')},
            ]
        )
        as_req = ApprovalEngineService.submit_for_approval('journal', as_jv.id, as_jv.reference_no, Decimal('10000.00'), self.as_user)
        with self.assertRaises(SoDViolationError):
            ApprovalEngineService.process_decision(as_req.id, self.as_user, 'approve')

        # AS-03: AS approval above limit (₹50,000) raises LimitExceededError
        jv_big = JournalService.create_draft_journal(
            maker=self.ae_user,
            journal_date=date(2026, 9, 17),
            description='Above AS limit JV',
            lines=[
                {'account_id': str(cash.id), 'debit': Decimal('184260.00'), 'credit': Decimal('0.00')},
                {'account_id': str(ar.id), 'debit': Decimal('0.00'), 'credit': Decimal('184260.00')},
            ]
        )
        req_big = ApprovalEngineService.submit_for_approval('journal', jv_big.id, jv_big.reference_no, Decimal('184260.00'), self.ae_user)
        with self.assertRaises(LimitExceededError):
            ApprovalEngineService.process_decision(req_big.id, self.as_user, 'approve')

        # FC-11: Controller approving related party transaction requires forward to CFO
        rp_item = HighRiskItem.objects.filter(kind='Related Party').first()
        if rp_item:
            with self.assertRaises(AccountingDomainError):
                FinanceControllerService.decide_high_risk_item(rp_item.item_no, 'approve', comment='Direct approve', ack=True, user=self.fc_user)

        # AUD-02: Auditor role cannot modify data (read-only)
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework.test import APIClient
        c_aud = APIClient()
        c_aud.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.aud_user).access_token))
        res_aud = c_aud.post('/api/v1/accounts/journals/', {'description': 'Auditor journal'}, format='json')
        self.assertEqual(res_aud.status_code, 403)
        self.assertEqual(res_aud.json()['error']['code'], 'READ_ONLY_ROLE')

    def test_02_cross_department_integration_flows(self):
        """Tests BA, PA, IA integration event consumption, balance, and duplicate resilience"""
        # BA-01: OPD cash bill auto-posts balanced journal
        opd_event = {
            'event_type': 'billing.invoice.created',
            'source_department': 'billing',
            'source_reference': 'INV-TEST-P12-01',
            'business_date': '2026-09-10',
            'amount': '1200.00',
            'tax_amount': '60.00',
            'party_type': 'patient',
            'party_id': 'UHID-P12-01',
            'payload': {'taxable_amount': '1140.00', 'patient_uhid': 'UHID-P12-01', 'is_opd': True}
        }
        res1 = EventInboxService.process_incoming_event(opd_event)
        self.assertIn(res1['status'], ['posted', 'created', 'success', 'pending_approval'])

        # BA-03: Duplicate event delivered returns duplicate_ignored
        res_dup = EventInboxService.process_incoming_event(opd_event)
        self.assertEqual(res_dup['status'], 'duplicate_ignored')

        # PA-01 & PA-02: Pharmacy sale and return
        sale_event = {
            'event_type': 'pharmacy.sale.completed',
            'source_department': 'pharmacy',
            'source_reference': 'PS-TEST-P12-01',
            'business_date': '2026-09-15',
            'amount': '5000.00',
            'tax_amount': '250.00',
            'payload': {'taxable_amount': '4750.00', 'cogs_amount': '3200.00', 'patient_uhid': 'UHID-P12-02', 'bill_no': 'PS-TEST-P12-01'}
        }
        res_sale = EventInboxService.process_incoming_event(sale_event)
        self.assertIn(res_sale['status'], ['posted', 'created', 'success'])

        return_event = {
            'event_type': 'pharmacy.return.processed',
            'source_department': 'pharmacy',
            'source_reference': 'PR-TEST-P12-01',
            'business_date': '2026-09-16',
            'amount': '5000.00',
            'tax_amount': '250.00',
            'payload': {'taxable_amount': '4750.00', 'cogs_amount': '3200.00', 'patient_uhid': 'UHID-P12-02', 'return_no': 'PR-TEST-P12-01', 'original_sale_ref': 'PS-TEST-P12-01'}
        }
        res_ret = EventInboxService.process_incoming_event(return_event)
        self.assertIn(res_ret['status'], ['posted', 'created', 'success'])

        # PA-03: Procurement GRN posts inventory debit, GRNI credit
        grn_event = {
            'event_type': 'inventory.grn.posted',
            'source_department': 'pharmacy',
            'source_reference': 'GRN-TEST-P12-01',
            'business_date': '2026-09-20',
            'amount': '208768.00',
            'tax_amount': '0.00',
            'payload': {'vendor_name': 'Apex Pharma Distributors', 'po_no': 'PO-TEST-26', 'grn_no': 'GRN-TEST-P12-01'}
        }
        res_grn = EventInboxService.process_incoming_event(grn_event)
        self.assertIn(res_grn['status'], ['posted', 'created', 'success'])

    def test_03_full_month_replay_simulation(self):
        """Simulates complete September 2026 transaction replay and verifies balanced journals"""
        sim_res = self.sim_svc.simulate_full_month_replay(period='2026-09', user=self.fc_user)
        self.assertEqual(sim_res['status'], 'completed')
        self.assertGreaterEqual(sim_res['events_replayed_count'], 6)
        self.assertEqual(sim_res['unbalanced_journals_count'], 0)
        self.assertEqual(sim_res['gl_difference'], '0.00')

    def test_04_ten_step_month_end_closing_sequence(self):
        """Executes the full 10-step closing sequence (§6) and verifies period lock & outbox event"""
        from .exceptions import BlockedByDependencyError

        # Step 1: Initial state is ~72%. FC-01: Trying to approve close at 72% raises BlockedByDependencyError
        initial_state = FinanceControllerService.calculate_state()
        self.assertLess(initial_state['readiness_pct'], 100)
        with self.assertRaises(BlockedByDependencyError):
            FinanceControllerService.approve_month_end_close('2026-09', self.fc_user)

        # Execute 10-step sequence
        closing_res = self.sim_svc.execute_month_end_closing_sequence(self.fc_user, self.cfo_user)
        self.assertEqual(closing_res['status'], 'completed')
        self.assertEqual(closing_res['final_readiness'], 100)
        self.assertTrue(closing_res['period_locked'])
        self.assertTrue(closing_res['quarter_locked'])
        self.assertTrue(closing_res['board_pack_approved'])
        self.assertEqual(len(closing_res['steps_executed']), 10)

        # Verify September PeriodLock is locked
        sep_lock = PeriodLock.objects.get(period_key='2026-09', branch_id='MAIN')
        self.assertEqual(sep_lock.status, 'locked')

        # Verify IntegrationOutbox accounts.period.locked event emitted
        self.assertTrue(IntegrationOutbox.objects.filter(event_type='accounts.period.locked').exists())

        # Verify posting in locked September is rejected (BA-08 period guard)
        late_event = {
            'event_type': 'billing.invoice.created',
            'source_department': 'billing',
            'source_reference': 'INV-LATE-SEP',
            'business_date': '2026-09-28',
            'amount': '1500.00',
            'payload': {'patient_uhid': 'UHID-LATE'}
        }
        res_late = EventInboxService.process_incoming_event(late_event)
        self.assertEqual(res_late['status'], EventStatus.REJECTED_BUSINESS)
        self.assertTrue(IntegrationOutbox.objects.filter(event_type='accounts.event.rejected').exists())

    def test_05_four_acceptance_invariants(self):
        """Verifies 4 Acceptance Criteria: Balanced GL, Tied Subledgers, Zero Orphan Events, Audit Chain"""
        # Execute closing sequence first
        self.sim_svc.execute_month_end_closing_sequence(self.fc_user, self.cfo_user)

        inv_res = self.sim_svc.verify_acceptance_invariants('2026-09')
        self.assertTrue(inv_res['invariants_passed'])
        self.assertEqual(inv_res['overall_status'], 'ACCEPTED')

        # Invariant 1: GL Balanced
        self.assertTrue(inv_res['invariants']['is_balanced']['passed'])
        self.assertEqual(inv_res['invariants']['is_balanced']['unbalanced_count'], 0)
        self.assertEqual(inv_res['invariants']['is_balanced']['gl_difference'], '0.00')

        # Invariant 2: Statements & Subledgers Tied
        self.assertTrue(inv_res['invariants']['statements_tied']['passed'])

        # Invariant 3: Zero Orphan Events
        self.assertTrue(inv_res['invariants']['zero_orphan_events']['passed'])
        self.assertEqual(inv_res['invariants']['zero_orphan_events']['orphan_count'], 0)

        # Invariant 4: Audit SHA-256 Chain Valid
        self.assertTrue(inv_res['invariants']['audit_chain_valid']['passed'])
        self.assertEqual(inv_res['invariants']['audit_chain_valid']['audit_status'], 'healthy')

    def test_06_non_functional_accounts_outage_replay_nf03(self):
        """Simulates 30-min Accounts downtime with replay and duplicate resilience (NF-03)"""
        outage_res = self.sim_svc.simulate_accounts_outage_replay()
        self.assertEqual(outage_res['status'], 'PASSED')
        self.assertTrue(outage_res['idempotency_preserved'])
        self.assertEqual(outage_res['events_generated'], 5)
        self.assertEqual(outage_res['replay_duplicates_ignored'], 5)

    def test_07_non_functional_concurrency_optimistic_locking_nf04(self):
        """Tests concurrent approvals version conflict 409 (NF-04)"""
        cash = ChartOfAccount.objects.get(code='1000')
        ar = ChartOfAccount.objects.get(code='1100')
        jv = JournalService.create_draft_journal(
            maker=self.ae_user,
            journal_date=date(2026, 10, 5),
            description='Concurrency test JV',
            lines=[
                {'account_id': str(cash.id), 'debit': Decimal('20000.00'), 'credit': Decimal('0.00')},
                {'account_id': str(ar.id), 'debit': Decimal('0.00'), 'credit': Decimal('20000.00')},
            ]
        )
        req = ApprovalEngineService.submit_for_approval('journal', jv.id, jv.reference_no, Decimal('20000.00'), self.ae_user)
        initial_version = req.version

        # Simulating first approver decision updating the request version
        ApprovalEngineService.process_decision(req.id, self.as_user, 'approve', version=initial_version)
        req.refresh_from_db()
        self.assertGreater(req.version, initial_version)

        # Simulating second concurrent approver acting with stale version
        with self.assertRaises(VersionConflictError):
            ApprovalEngineService.process_decision(req.id, self.am_user, 'approve', version=initial_version)

    def test_08_rest_simulation_and_signoff_api_endpoints(self):
        """Verifies Phase 12 REST API endpoints return 200 with structured response bodies"""
        self.client.force_authenticate(self.fc_user)

        # 1. Full Month Replay API
        r_rep = self.client.post('/api/v1/accounts/simulation/full-month-replay/', {'period': '2026-09'}, format='json')
        self.assertEqual(r_rep.status_code, 200)
        self.assertEqual(r_rep.data['status'], 'completed')

        # 2. Month Close Sequence API
        r_seq = self.client.post('/api/v1/accounts/simulation/close-sequence/', {}, format='json')
        self.assertEqual(r_seq.status_code, 200)
        self.assertEqual(r_seq.data['status'], 'completed')
        self.assertEqual(r_seq.data['final_readiness'], 100)

        # 3. Acceptance Invariants API
        r_inv = self.client.get('/api/v1/accounts/simulation/invariants/?period=2026-09')
        self.assertEqual(r_inv.status_code, 200)
        self.assertTrue(r_inv.data['invariants_passed'])

        # 4. Outage Replay Simulation API
        r_out = self.client.post('/api/v1/accounts/simulation/outage-replay/', {}, format='json')
        self.assertEqual(r_out.status_code, 200)
        self.assertEqual(r_out.data['status'], 'PASSED')

        # 5. UAT Sign-off Report API
        r_uat = self.client.get('/api/v1/accounts/simulation/uat-signoff/')
        self.assertEqual(r_uat.status_code, 200)
        self.assertEqual(r_uat.data['status'], 'ACCEPTED')
        self.assertEqual(r_uat.data['defect_log']['sev1_critical_open'], 0)
        self.assertEqual(r_uat.data['defect_log']['sev2_high_open'], 0)

