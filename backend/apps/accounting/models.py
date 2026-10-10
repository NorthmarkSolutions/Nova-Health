import uuid
import hashlib
import json
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.conf import settings
from apps.accounts.models import RoleType

User = settings.AUTH_USER_MODEL

# =============================================================================
# SECTION A: Master Data & Configuration
# =============================================================================

class AccountType(models.TextChoices):
    ASSET = 'asset', 'Asset'
    LIABILITY = 'liability', 'Liability'
    EQUITY = 'equity', 'Equity'
    REVENUE = 'revenue', 'Revenue'
    EXPENSE = 'expense', 'Expense'

class ControlAccountType(models.TextChoices):
    NONE = 'none', 'None'
    RECEIVABLE = 'receivable', 'Receivable Control'
    PAYABLE = 'payable', 'Payable Control'
    BANK = 'bank', 'Bank Control'
    GST_INPUT = 'gst_input', 'GST Input (ITC)'
    GST_OUTPUT = 'gst_output', 'GST Output'
    TDS = 'tds', 'TDS Withholding'

class ChartOfAccount(models.Model):
    """General Ledger Chart of Accounts (COA)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_id = models.CharField(max_length=50, default='HOSP-NORTH-01')
    branch_id = models.CharField(max_length=50, default='MAIN')
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=AccountType.choices)
    sub_type = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_control_account = models.BooleanField(default=False)
    control_for = models.CharField(max_length=20, choices=ControlAccountType.choices, default=ControlAccountType.NONE)
    is_postable = models.BooleanField(default=True)
    requires_cost_center = models.BooleanField(default=False)
    requires_department = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounts_chart_of_accounts'
        unique_together = ('hospital_id', 'code')
        indexes = [
            models.Index(fields=['type', 'active']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.type})"


class CostCenter(models.Model):
    """Cost Centers for allocation and granular reporting"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_id = models.CharField(max_length=50, default='HOSP-NORTH-01')
    branch_id = models.CharField(max_length=50, default='MAIN')
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=255)
    department_id = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    owner_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_cost_centers')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_cost_centers'
        unique_together = ('hospital_id', 'code')

    def __str__(self):
        return f"{self.code} - {self.name}"


class DepartmentMirror(models.Model):
    """Read-only mirror of operational hospital departments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=30, default='clinical')
    head_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_departments'

    def __str__(self):
        return f"{self.code} - {self.name}"


class VendorMirror(models.Model):
    """Accounts mirror of Procurement Vendors with statutory & risk metadata"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_vendor_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    gstin = models.CharField(max_length=20, blank=True, db_index=True)
    pan = models.CharField(max_length=20, blank=True)
    msme_flag = models.BooleanField(default=False)
    msme_registration = models.CharField(max_length=100, blank=True)
    payment_terms_days = models.IntegerField(default=30)
    bank_account_masked = models.CharField(max_length=50, blank=True)
    bank_change_pending = models.BooleanField(default=False)
    bank_changed_at = models.DateTimeField(null=True, blank=True)
    bank_change_verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_vendor_bank_changes')
    tds_section = models.CharField(max_length=20, blank=True)
    risk_flag = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'accounts_vendors'

    def __str__(self):
        return f"{self.name} ({self.gstin})"


class CustomerMirror(models.Model):
    """Payer master mirror (insurance, TPA, corporates, self-pay groups)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_type = models.CharField(max_length=30, default='insurance')
    source_id = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    gstin = models.CharField(max_length=20, blank=True)
    credit_days = models.IntegerField(default=30)
    contact_name = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.CharField(max_length=100, blank=True)
    owner_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_payer_customers')

    class Meta:
        db_table = 'accounts_customers'
        unique_together = ('source_type', 'source_id')

    def __str__(self):
        return f"{self.name} [{self.source_type}]"


class BankAccount(models.Model):
    """Hospital bank accounts (collections, operating, payments)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_id = models.CharField(max_length=50, default='HOSP-NORTH-01')
    branch_id = models.CharField(max_length=50, default='MAIN')
    bank_name = models.CharField(max_length=100)
    account_no_masked = models.CharField(max_length=50)
    ifsc = models.CharField(max_length=20)
    purpose = models.CharField(max_length=50, default='general')
    gl_account = models.ForeignKey(ChartOfAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_accounts')
    book_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    statement_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    last_reconciled_on = models.DateField(null=True, blank=True)
    frozen = models.BooleanField(default=False)
    frozen_reason = models.TextField(blank=True)
    frozen_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='frozen_bank_accounts')
    frozen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_bank_accounts'
        unique_together = ('hospital_id', 'account_no_masked', 'ifsc')

    def __str__(self):
        return f"{self.bank_name} {self.account_no_masked} ({self.purpose})"


class NumberSequence(models.Model):
    """Gap-controlled document numbers per branch/type/period"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch_id = models.CharField(max_length=50, default='MAIN')
    doc_type = models.CharField(max_length=20)
    period_key = models.CharField(max_length=20, default='GLOBAL')
    next_value = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounts_number_sequences'
        unique_together = ('branch_id', 'doc_type', 'period_key')

    def __str__(self):
        return f"{self.doc_type}-{self.period_key}: {self.next_value}"


class DelegationLimit(models.Model):
    """Delegation of Financial Authority (DoFA POL-01) matrix"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy_version_id = models.CharField(max_length=50, default='POL-01-v3.2')
    role = models.CharField(max_length=50)
    document_type = models.CharField(max_length=50)
    max_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    requires_cosign_role = models.CharField(max_length=50, blank=True)
    cosign_above_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    effective_from = models.DateField(auto_now_add=True)
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_delegation_limits'
        indexes = [
            models.Index(fields=['document_type', 'role', 'effective_from']),
        ]

    def __str__(self):
        return f"{self.role} -> {self.document_type} (Limit: {self.max_amount or 'Unlimited'})"


class EventMapping(models.Model):
    """How inbound departmental financial events translate to GL journal lines"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100)
    schema_version = models.CharField(max_length=20, default='1.0')
    line_templates = models.JSONField(default=list)
    auto_post = models.BooleanField(default=False)
    auto_post_max_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    requires_validation = models.BooleanField(default=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = 'accounts_event_mappings'
        unique_together = ('event_type', 'schema_version')

    def __str__(self):
        return f"{self.event_type} v{self.schema_version} (AutoPost: {self.auto_post})"


# =============================================================================
# SECTION B: Integration & Inbound Event Inbox
# =============================================================================

class EventStatus(models.TextChoices):
    RECEIVED = 'received', 'Received'
    PENDING_VALIDATION = 'pending_validation', 'Pending Validation'
    VALIDATED = 'validated', 'Validated'
    REJECTED_BUSINESS = 'rejected_business', 'Rejected (Business)'
    REJECTED_TECHNICAL = 'rejected_technical', 'Rejected (Technical)'
    DUPLICATE_IGNORED = 'duplicate_ignored', 'Duplicate Ignored'
    PARKED = 'parked', 'Parked'
    POSTED = 'posted', 'Posted'
    SUPERSEDED = 'superseded', 'Superseded'

class FinancialEvent(models.Model):
    """Inbox of every financial event received from hospital departments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_id = models.CharField(max_length=100, unique=True)
    event_type = models.CharField(max_length=100)
    schema_version = models.CharField(max_length=20, default='1.0')
    source_department = models.CharField(max_length=50)
    source_reference = models.CharField(max_length=100)
    correlation_id = models.CharField(max_length=100, blank=True)
    idempotency_key = models.CharField(max_length=150, unique=True, db_index=True)
    business_date = models.DateField()
    original_business_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    party_type = models.CharField(max_length=50, blank=True)
    party_id = models.CharField(max_length=100, blank=True)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=30, choices=EventStatus.choices, default=EventStatus.RECEIVED)
    rejection_reason = models.TextField(blank=True)
    journal = models.ForeignKey('Journal', on_delete=models.SET_NULL, null=True, blank=True, related_name='source_events')
    retry_count = models.IntegerField(default=0)
    parked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_financial_events'
        indexes = [
            models.Index(fields=['status', 'business_date']),
            models.Index(fields=['source_department', 'source_reference']),
            models.Index(fields=['correlation_id']),
        ]

    def __str__(self):
        return f"{self.event_type} ({self.source_reference}) [{self.status}]"


class EventValidation(models.Model):
    """Audit record of Executive validation decisions on incoming events"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(FinancialEvent, on_delete=models.CASCADE, related_name='validations')
    validated_by = models.ForeignKey(User, on_delete=models.PROTECT)
    decision = models.CharField(max_length=20, default='validated')
    checks = models.JSONField(default=dict)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_event_validations'


class IntegrationOutbox(models.Model):
    """Transactional Outbox for domain events emitted by Accounts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aggregate_type = models.CharField(max_length=50)
    aggregate_id = models.CharField(max_length=100)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    published_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_outbox'
        indexes = [
            models.Index(fields=['published_at', 'created_at']),
        ]


# =============================================================================
# SECTION C: Journals & Double-Entry General Ledger
# =============================================================================

class JournalStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SUBMITTED = 'submitted', 'Submitted'
    RETURNED = 'returned', 'Returned'
    IN_APPROVAL = 'in_approval', 'In Approval'
    APPROVED = 'approved', 'Approved'
    POSTED = 'posted', 'Posted'
    REJECTED = 'rejected', 'Rejected'
    REVERSED = 'reversed', 'Reversed'

class JournalEntryType(models.TextChoices):
    REVENUE_ADJUSTMENT = 'revenue_adjustment', 'Revenue Adjustment'
    EXPENSE_ADJUSTMENT = 'expense_adjustment', 'Expense Adjustment'
    ACCRUAL = 'accrual', 'Accrual'
    DEPRECIATION = 'depreciation', 'Depreciation'
    REVERSAL = 'reversal', 'Reversal'
    PAYROLL = 'payroll', 'Payroll'
    SYSTEM_EVENT = 'system_event', 'System Event'
    PROVISION = 'provision', 'Provision'
    WRITE_OFF = 'write_off', 'Write Off'

class Journal(models.Model):
    """Voucher header for double-entry financial journals"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital_id = models.CharField(max_length=50, default='HOSP-NORTH-01')
    branch_id = models.CharField(max_length=50, default='MAIN')
    reference_no = models.CharField(max_length=50, unique=True, db_index=True)
    journal_date = models.DateField()
    posting_period = models.CharField(max_length=20, db_index=True)  # YYYY-MM
    entry_type = models.CharField(max_length=30, choices=JournalEntryType.choices, default=JournalEntryType.SYSTEM_EVENT)
    source = models.CharField(max_length=20, default='manual')  # manual|system|event
    description = models.TextField()
    external_reference = models.CharField(max_length=100, blank=True)
    total_debit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    total_credit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, choices=JournalStatus.choices, default=JournalStatus.DRAFT)
    maker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_journals')
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='posted_journals')
    auto_reverse_on = models.DateField(null=True, blank=True)
    reversal_of_journal = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversal_journals')
    financial_event = models.ForeignKey(FinancialEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='journals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounts_journals'
        indexes = [
            models.Index(fields=['posting_period', 'status']),
            models.Index(fields=['maker', 'status']),
        ]

    def __str__(self):
        return f"{self.reference_no} ({self.total_debit}) [{self.status}]"


class JournalLine(models.Model):
    """Individual debit or credit posting leg"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='lines')
    line_no = models.IntegerField()
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='journal_lines')
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    department_id = models.CharField(max_length=50, blank=True)
    party_type = models.CharField(max_length=50, blank=True)
    party_id = models.CharField(max_length=100, blank=True)
    narration = models.TextField(blank=True)
    tax_code = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'accounts_journal_lines'
        unique_together = ('journal', 'line_no')
        indexes = [
            models.Index(fields=['account']),
            models.Index(fields=['cost_center']),
        ]

    def __str__(self):
        side = f"Dr {self.debit}" if self.debit > 0 else f"Cr {self.credit}"
        return f"Line {self.line_no}: {self.account.code} {side}"


class GLEntry(models.Model):
    """Immutable posted ledger row in the General Ledger"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(Journal, on_delete=models.PROTECT, related_name='gl_entries')
    journal_line = models.ForeignKey(JournalLine, on_delete=models.PROTECT, null=True, blank=True)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='gl_entries')
    posting_date = models.DateField()
    period = models.CharField(max_length=20, db_index=True)  # YYYY-MM
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True)
    department_id = models.CharField(max_length=50, blank=True)
    party_type = models.CharField(max_length=50, blank=True)
    party_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_gl_entries'
        indexes = [
            models.Index(fields=['account', 'period']),
            models.Index(fields=['period', 'department_id']),
            models.Index(fields=['party_type', 'party_id']),
        ]


class GLBalance(models.Model):
    """Aggregated period balances for trial balance, P&L, and balance sheet"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period = models.CharField(max_length=20, db_index=True)  # YYYY-MM
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='period_balances')
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True)
    department_id = models.CharField(max_length=50, blank=True)
    opening = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    closing = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    is_provisional = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_gl_balances'
        unique_together = ('period', 'account', 'cost_center', 'department_id')


# =============================================================================
# SECTION I: Approval Engine, Escalations & Tasks
# =============================================================================

class ApprovalStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    RETURNED = 'returned', 'Returned'
    REJECTED = 'rejected', 'Rejected'
    FORWARDED = 'forwarded', 'Forwarded'
    ESCALATED = 'escalated', 'Escalated'
    WITHDRAWN = 'withdrawn', 'Withdrawn'

class ApprovalLevel(models.TextChoices):
    SUPERVISOR = 'supervisor', 'Accounts Supervisor'
    MANAGER = 'manager', 'Accounts Manager'
    CONTROLLER = 'controller', 'Finance Controller'
    CFO = 'cfo', 'Chief Financial Officer'
    BOARD = 'board', 'Board of Trustees'

class PriorityType(models.TextChoices):
    HIGH = 'high', 'High'
    MEDIUM = 'medium', 'Medium'
    LOW = 'low', 'Low'

class ApprovalRequest(models.Model):
    """Central maker-checker approval queue item"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(max_length=50)  # journal|vendor_bill|expense|refund|write_off|payment_batch
    document_id = models.UUIDField(db_index=True)
    reference_no = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    maker = models.ForeignKey(User, on_delete=models.PROTECT, related_name='initiated_approval_requests')
    current_level = models.CharField(max_length=30, choices=ApprovalLevel.choices, default=ApprovalLevel.SUPERVISOR)
    current_approver_role = models.CharField(max_length=50, choices=RoleType.choices, default=RoleType.ACCOUNTS_SUPERVISOR)
    assigned_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_approval_requests')
    priority = models.CharField(max_length=20, choices=PriorityType.choices, default=PriorityType.MEDIUM)
    risk_flags = models.JSONField(default=list)  # missing_documents, duplicate_risk, budget_exceeded, etc.
    status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounts_approval_requests'
        indexes = [
            models.Index(fields=['current_approver_role', 'status', 'priority', 'submitted_at']),
            models.Index(fields=['maker', 'status']),
        ]

    def __str__(self):
        return f"{self.reference_no} ({self.document_type}) [{self.status}]"


class ApprovalStep(models.Model):
    """Audit leg of each decision made in the approval chain"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='steps')
    step_no = models.IntegerField()
    level = models.CharField(max_length=30)
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    decision = models.CharField(max_length=30)  # approve|approve_and_forward|return|reject|forward|escalate|hold
    comment = models.TextField(blank=True)
    reason_code = models.CharField(max_length=50, blank=True)
    acknowledgements = models.JSONField(default=list)
    limit_applied = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_approval_steps'
        unique_together = ('approval_request', 'step_no')


class Escalation(models.Model):
    """Supervisory and management escalations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=50, default='approval')
    reason = models.CharField(max_length=50)  # high_amount|duplicate_risk|compliance_risk|budget_violation|fraud_concern
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    raised_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='raised_escalations')
    raised_to = models.CharField(max_length=50)  # manager|controller|cfo|recovery_desk
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='open')  # open|investigating|forwarded|resolved
    resolution = models.TextField(blank=True)
    notes = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_escalations'
        indexes = [
            models.Index(fields=['status', 'raised_to']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]


class AccountTask(models.Model):
    """Executive daily tasks (My Tasks Today)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    module = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    assignee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts_tasks')
    priority = models.CharField(max_length=20, choices=PriorityType.choices, default=PriorityType.MEDIUM)
    due_at = models.DateTimeField()
    status = models.CharField(max_length=20, default='open')  # open|done|cancelled
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_tasks'
        indexes = [
            models.Index(fields=['assignee', 'status', 'due_at']),
        ]


# =============================================================================
# SECTION J: Period & Close Control
# =============================================================================

class PeriodLockStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    SOFT_CLOSED = 'soft_closed', 'Soft Closed'
    CLOSE_PENDING = 'close_pending', 'Close Pending'
    CLOSE_APPROVED = 'close_approved', 'Close Approved'
    LOCKED = 'locked', 'Locked'
    REOPEN_REQUESTED = 'reopen_requested', 'Reopen Requested'
    REOPENED = 'reopened', 'Reopened'

class PeriodLock(models.Model):
    """Fiscal and monthly period locking controls"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch_id = models.CharField(max_length=50, default='MAIN')
    period_type = models.CharField(max_length=20, default='month')  # month|quarter|year
    period_key = models.CharField(max_length=20, db_index=True)     # 2026-09, 2026-10, FY27-Q2
    status = models.CharField(max_length=30, choices=PeriodLockStatus.choices, default=PeriodLockStatus.OPEN)
    close_target_date = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_period_locks')
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executed_period_locks')
    locked_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_period_locks'
        unique_together = ('branch_id', 'period_type', 'period_key')

    def __str__(self):
        return f"{self.period_key} [{self.status}]"


class PeriodCloseRun(models.Model):
    """Period closing workflow execution state"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period_type = models.CharField(max_length=20, default='month')
    period_key = models.CharField(max_length=20)
    readiness_pct = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='in_progress')
    target_date = models.DateField(null=True, blank=True)
    delayed_to = models.DateField(null=True, blank=True)
    delay_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_period_close_runs'


class DailyCloseRun(models.Model):
    """Supervisor daily operations close and verification run"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch_id = models.CharField(max_length=50, default='MAIN')
    business_date = models.DateField()
    status = models.CharField(max_length=30, default='open')  # open|run|locked|escalated
    run_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='run_daily_closes')
    run_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='locked_daily_closes')
    locked_at = models.DateTimeField(null=True, blank=True)
    blockers = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_daily_close_runs'
        unique_together = ('branch_id', 'business_date')


class CloseChecklistItem(models.Model):
    """Individual checklist milestones for daily and monthly close"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    close_run_id = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    owner_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    progress_pct = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='in_progress')  # done|in_progress|at_risk|delayed
    computed_from = models.CharField(max_length=100, blank=True)
    last_computed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_close_checklist_items'


# =============================================================================
# SECTION L: Audit Log (Cryptographic Hash Chain) & Documents
# =============================================================================

class AuditLogImmutableError(Exception):
    """Raised when code tries to modify or delete an audit record (the database refuses it as well)"""


class AccountAuditLog(models.Model):
    """Immutable, append-only financial audit trail with SHA-256 hash chaining.
    Rows are written only by AuditService; database triggers reject UPDATE and DELETE.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.PositiveBigIntegerField(unique=True, null=True, db_index=True)
    actor_user = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=50)
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    reference_no = models.CharField(max_length=50, blank=True)
    previous_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    diff = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    ip_address = models.CharField(max_length=50, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    previous_hash = models.CharField(max_length=64, blank=True)
    entry_hash = models.CharField(max_length=64, db_index=True)
    occurred_at = models.DateTimeField(default=timezone.now, editable=False, db_index=True)

    class Meta:
        db_table = 'accounts_audit_logs'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id', 'occurred_at']),
            models.Index(fields=['actor_user', 'occurred_at']),
            models.Index(fields=['module', 'action', 'occurred_at']),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AuditLogImmutableError('Audit records are append-only and cannot be modified.')
        if not self.entry_hash:
            raise AuditLogImmutableError('Audit records must be written through AuditService.log_action.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AuditLogImmutableError('Audit records are append-only and cannot be deleted.')


class AccountDocument(models.Model):
    """Supporting documentation attachments (invoices, receipts, approvals)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    doc_type = models.CharField(max_length=50)  # invoice|grn|approval_note|bank_advice|evidence|board_pack
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_documents')
    rejection_reason = models.TextField(blank=True)
    checksum = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_documents'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
        ]


class DocumentRequirement(models.Model):
    """Business policy rules for mandatory documentation attachments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(max_length=50)
    condition_expr = models.CharField(max_length=255)
    required_doc_types = models.JSONField(default=list)

    class Meta:
        db_table = 'accounts_document_requirements'


# =============================================================================
# SECTION D: Receivables & Collections (Phase 2)
# =============================================================================

class ReceivableType(models.TextChoices):
    INSURANCE = 'insurance', 'Insurance Claim'
    TPA = 'tpa', 'TPA Claim'
    CORPORATE = 'corporate', 'Corporate Credit'
    PATIENT_CREDIT = 'patient_credit', 'Patient Credit'
    GOVERNMENT = 'government', 'Government Scheme'
    OTHER = 'other', 'Other'

class ReceivableStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    PARTIALLY_SETTLED = 'partially_settled', 'Partially Settled'
    SETTLED = 'settled', 'Settled'
    DISPUTED = 'disputed', 'Disputed'
    WRITTEN_OFF = 'written_off', 'Written Off'
    CLOSED = 'closed', 'Closed'

class AgingBucket(models.TextChoices):
    BUCKET_0_30 = '0_30', '0-30 Days'
    BUCKET_31_60 = '31_60', '31-60 Days'
    BUCKET_61_90 = '61_90', '61-90 Days'
    BUCKET_90_PLUS = '90_plus', '90+ Days'

class Receivable(models.Model):
    """Open receivable line owed to hospital (invoices, corporate credits, insurance claims)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=100, db_index=True)
    receivable_type = models.CharField(max_length=30, choices=ReceivableType.choices, default=ReceivableType.PATIENT_CREDIT)
    customer = models.ForeignKey(CustomerMirror, on_delete=models.SET_NULL, null=True, blank=True, related_name='receivables')
    patient_uhid = models.CharField(max_length=50, blank=True)
    patient_name = models.CharField(max_length=150, blank=True)
    department_id = models.CharField(max_length=50, default='billing')
    invoice_date = models.DateField()
    due_date = models.DateField()
    original_amount = models.DecimalField(max_digits=18, decimal_places=2)
    settled_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    disallowed_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    written_off_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    outstanding_amount = models.DecimalField(max_digits=18, decimal_places=2)
    aging_bucket = models.CharField(max_length=20, choices=AgingBucket.choices, default=AgingBucket.BUCKET_0_30)
    status = models.CharField(max_length=30, choices=ReceivableStatus.choices, default=ReceivableStatus.OPEN)
    recovery_priority = models.CharField(max_length=20, default='medium')  # high|medium|low
    promised_date = models.DateField(null=True, blank=True)
    promise_missed_days = models.IntegerField(default=0)
    is_escalated = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    dispute_reason = models.TextField(blank=True)
    last_followup_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_receivables'
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['aging_bucket', 'status']),
            models.Index(fields=['customer', 'status']),
        ]

    def __str__(self):
        return f"{self.reference_no} (₹{self.outstanding_amount}) [{self.status}]"


class Receipt(models.Model):
    """Payments received from patients, insurers, and corporate debtors"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_no = models.CharField(max_length=50, unique=True)
    source = models.CharField(max_length=50, default='billing_counter')  # billing_counter|insurance_settlement|corporate|bank_credit
    mode = models.CharField(max_length=20, default='cash')               # cash|card|upi|neft|cheque
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    received_on = models.DateField()
    bank_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True)
    financial_event = models.ForeignKey(FinancialEvent, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, default='unallocated')     # unallocated|allocated|reversed
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_receipts'


class ReceiptAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='allocations')
    receivable = models.ForeignKey(Receivable, on_delete=models.CASCADE, related_name='allocations')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    allocated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_receipt_allocations'


class CollectionStage(models.TextChoices):
    DUE_TODAY = 'due_today', 'Due Today'
    PROMISED = 'promised', 'Promised to Pay'
    FOLLOWUP_REQUIRED = 'followup_required', 'Follow-up Required'
    ESCALATED = 'escalated', 'Escalated'
    RECOVERED = 'recovered', 'Recovered'

class CollectionCase(models.Model):
    """Payer-level recovery pipeline case tracking"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(CustomerMirror, on_delete=models.CASCADE, related_name='collection_cases')
    stage = models.CharField(max_length=30, choices=CollectionStage.choices, default=CollectionStage.FOLLOWUP_REQUIRED)
    owner_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_collection_cases')
    outstanding_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    next_action = models.CharField(max_length=255, blank=True)
    next_action_on = models.DateField(null=True, blank=True)
    recovery_priority = models.CharField(max_length=20, choices=PriorityType.choices, default=PriorityType.MEDIUM)
    escalated = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_collection_cases'


class CollectionFollowup(models.Model):
    """Log of collection calls, letters, portal interactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(CollectionCase, on_delete=models.CASCADE, null=True, blank=True, related_name='followups')
    receivable = models.ForeignKey(Receivable, on_delete=models.CASCADE, null=True, blank=True, related_name='followups')
    channel = models.CharField(max_length=20, default='call')  # call|email|letter|portal|visit
    contact_person = models.CharField(max_length=100, blank=True)
    outcome = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    next_action_on = models.DateField(null=True, blank=True)
    logged_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_collection_followups'


class PromiseToPay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(CollectionCase, on_delete=models.CASCADE, related_name='promises')
    promised_amount = models.DecimalField(max_digits=18, decimal_places=2)
    promised_on = models.DateField()
    status = models.CharField(max_length=20, default='open')  # open|kept|missed|partial
    days_late = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_promises_to_pay'


class WriteOffRequest(models.Model):
    """Write-off request raised by Executive for bad debts or disallowances"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(CustomerMirror, on_delete=models.SET_NULL, null=True, blank=True)
    receivable = models.ForeignKey(Receivable, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    reason = models.TextField()
    category = models.CharField(max_length=50, default='disallowance')  # disallowance|hardship|time_barred|dispute_settlement
    status = models.CharField(max_length=20, default='pending')           # draft|pending|approved|rejected|forwarded
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True)
    journal = models.ForeignKey(Journal, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_write_off_requests'


class RefundStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Approval'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    PAID = 'paid', 'Paid / Executed'

class Refund(models.Model):
    """Refunds raised by Billing that require Accounts approval above Billing limits"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    patient_uhid = models.CharField(max_length=50, blank=True)
    patient_name = models.CharField(max_length=150, blank=True)
    source_bill_no = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    refund_mode = models.CharField(max_length=30, default='cash')  # cash|card|upi|bank_transfer
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=RefundStatus.choices, default=RefundStatus.PENDING)
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    financial_event = models.ForeignKey(FinancialEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    journal = models.ForeignKey(Journal, on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    maker = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='created_accounts_refunds')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_accounts_refunds')
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_refunds'
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['source_bill_no']),
            models.Index(fields=['patient_uhid']),
        ]

    def __str__(self):
        return f"{self.reference_no} (₹{self.amount}) [{self.status}]"


# =============================================================================
# SECTION E: Payables & Vendor Bills (Phase 2)
# =============================================================================

class BillStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SUBMITTED = 'submitted', 'Submitted'
    RETURNED = 'returned', 'Returned'
    IN_APPROVAL = 'in_approval', 'In Approval'
    APPROVED = 'approved', 'Approved'
    ON_HOLD = 'on_hold', 'On Hold'
    SCHEDULED = 'scheduled', 'Scheduled'
    PAID = 'paid', 'Paid'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'

class VendorBill(models.Model):
    """Vendor bills entered or drafted from Procurement with 3-way match & duplicate check"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey(VendorMirror, on_delete=models.PROTECT, related_name='bills')
    invoice_no = models.CharField(max_length=100)
    invoice_date = models.DateField()
    due_date = models.DateField()
    po_no = models.CharField(max_length=50, blank=True)
    grn_nos = models.JSONField(default=list)
    department_id = models.CharField(max_length=50, default='pharmacy')
    category = models.CharField(max_length=50, default='pharmacy_supplies')
    taxable_amount = models.DecimalField(max_digits=18, decimal_places=2)
    cgst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    sgst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    igst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    tds_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    net_payable = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=30, choices=BillStatus.choices, default=BillStatus.DRAFT)
    payment_priority = models.CharField(max_length=20, default='normal')  # urgent|normal|defer
    duplicate_score = models.IntegerField(default=0)                      # 0-100 duplicate risk score
    duplicate_of_bill = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    maker = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_vendor_bills')
    financial_event = models.ForeignKey(FinancialEvent, on_delete=models.SET_NULL, null=True, blank=True)
    journal = models.ForeignKey(Journal, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounts_vendor_bills'
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['vendor', 'invoice_no']),
        ]

    def __str__(self):
        return f"{self.reference_no} - {self.vendor.name} (₹{self.net_payable})"


class VendorBillItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill = models.ForeignKey(VendorBill, on_delete=models.CASCADE, related_name='items')
    line_no = models.IntegerField()
    item_code = models.CharField(max_length=50, blank=True)
    description = models.CharField(max_length=255)
    hsn_sac = models.CharField(max_length=20, blank=True)
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1.00'))
    rate = models.DecimalField(max_digits=18, decimal_places=2)
    taxable = models.DecimalField(max_digits=18, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    account = models.ForeignKey(ChartOfAccount, on_delete=models.SET_NULL, null=True, blank=True)
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'accounts_vendor_bill_items'


class ThreeWayMatch(models.Model):
    """Automated comparison between Purchase Order, Goods Receipt Note, and Vendor Invoice"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill = models.OneToOneField(VendorBill, on_delete=models.CASCADE, related_name='three_way_match')
    po_no = models.CharField(max_length=50, blank=True)
    grn_no = models.CharField(max_length=50, blank=True)
    result = models.CharField(max_length=30, default='matched')  # matched|qty_variance|price_variance|missing_grn|missing_po
    variance_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    variance_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    checked_at = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict)

    class Meta:
        db_table = 'accounts_three_way_matches'


# =============================================================================
# SECTION F: Bank & Reconciliation (Phase 2)
# =============================================================================

class BankStatement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='statements')
    period_from = models.DateField()
    period_to = models.DateField()
    opening_balance = models.DecimalField(max_digits=18, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=18, decimal_places=2)
    format = models.CharField(max_length=20, default='csv')  # csv|mt940|camt053
    imported_by = models.ForeignKey(User, on_delete=models.PROTECT)
    imported_at = models.DateTimeField(auto_now_add=True)
    line_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'accounts_bank_statements'


class BankTransaction(models.Model):
    """Raw bank statement transaction line"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statement = models.ForeignKey(BankStatement, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    txn_date = models.DateField()
    value_date = models.DateField()
    bank_reference = models.CharField(max_length=100, blank=True)
    narration = models.TextField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    direction = models.CharField(max_length=10)                  # credit|debit
    type = models.CharField(max_length=30, default='neft')       # neft|upi|pos|cheque|charges|interest|other
    match_status = models.CharField(max_length=30, default='unmatched')  # unmatched|suggested|matched|for_review|excluded
    suggested_matches = models.JSONField(default=list)

    class Meta:
        db_table = 'accounts_bank_transactions'
        indexes = [
            models.Index(fields=['bank_account', 'txn_date']),
            models.Index(fields=['match_status']),
        ]


class ReconciliationMatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_transaction = models.ForeignKey(BankTransaction, on_delete=models.CASCADE, related_name='matches')
    matched_type = models.CharField(max_length=30)  # receipt|payment|journal
    matched_id = models.CharField(max_length=100)
    confidence = models.IntegerField(default=85)    # 0-100%
    method = models.CharField(max_length=30, default='suggested')  # auto|suggested|manual
    difference_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    proposed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='proposed_reconciliations')
    status = models.CharField(max_length=30, default='proposed')   # proposed|approved|rejected
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reconciliations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_reconciliation_matches'


# =============================================================================
# SECTION G: Expenses & Budgets (Phase 2)
# =============================================================================

class ExpenseRequest(models.Model):
    """Departmental expense requests with budget verification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    department_id = models.CharField(max_length=50)
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True)
    requested_by_staff = models.CharField(max_length=150)
    expense_type = models.CharField(max_length=50, default='medical_consumables')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    business_reason = models.TextField()
    budget_available_at_submit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='draft')  # draft|submitted|returned|in_approval|approved|rejected|paid|posted
    maker = models.ForeignKey(User, on_delete=models.PROTECT, related_name='expense_requests')
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_expense_requests'


class Budget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.CharField(max_length=20, default='FY2026-27')
    department_id = models.CharField(max_length=50)
    cost_center = models.ForeignKey(CostCenter, on_delete=models.SET_NULL, null=True, blank=True, related_name='budgets')
    head_name = models.CharField(max_length=150, blank=True, default='')
    allocated_amount = models.DecimalField(max_digits=18, decimal_places=2)
    consumed_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    committed_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    explanation_requested = models.BooleanField(default=False)
    overrun_escalated = models.BooleanField(default=False)
    trail = models.JSONField(default=list)

    class Meta:
        db_table = 'accounts_budgets'


# =============================================================================
# SECTION H: GST & Tax (Phase 2 & Phase 4)
# =============================================================================

class GSTBatch(models.Model):
    """GSTR-1 outward and GSTR-2B inward tax preparation batches"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True)
    direction = models.CharField(max_length=20, default='outward')  # outward|inward_itc
    period_from = models.DateField()
    period_to = models.DateField()
    invoice_count = models.IntegerField(default=0)
    taxable_value = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    tax_value = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    exception_count = models.IntegerField(default=0)
    status = models.CharField(max_length=30, default='draft')  # draft|submitted|returned|approved|rejected|included_in_return|escalated
    prepared_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='prepared_gst_batches')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_gst_batches')
    reviewed_by_manager = models.BooleanField(default=False)
    turnaround_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_gst_batches'


class GSTBatchLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(GSTBatch, on_delete=models.CASCADE, related_name='lines')
    invoice_no = models.CharField(max_length=100)
    invoice_date = models.DateField()
    customer_or_vendor_id = models.CharField(max_length=100, blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    place_of_supply = models.CharField(max_length=50, default='27-Maharashtra')
    hsn_sac = models.CharField(max_length=20, blank=True)
    taxable_value = models.DecimalField(max_digits=18, decimal_places=2)
    cgst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    sgst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    igst = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    classification = models.CharField(max_length=20, default='b2b')  # b2b|b2c|export|exempt

    class Meta:
        db_table = 'accounts_gst_batch_lines'


class GSTException(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(GSTBatch, on_delete=models.CASCADE, related_name='exceptions')
    line = models.ForeignKey(GSTBatchLine, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=50)  # missing_gstin|invalid_gstin|tax_mismatch|duplicate|credit_note_not_netted
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, default='open')  # open|resolved|accepted
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_gst_exceptions'


# =============================================================================
# SECTION I: Financial Exceptions & Reviews (Phase 4)
# =============================================================================

class ExceptionStatus(models.TextChoices):
    NEW = 'new', 'New'
    ASSIGNED = 'assigned', 'Assigned'
    INVESTIGATING = 'investigating', 'Investigating'
    ESCALATED = 'escalated', 'Escalated'
    CLOSED = 'closed', 'Closed'


class FinancialException(models.Model):
    """Central Financial Exception model (Screen 3.10)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exception_no = models.CharField(max_length=50, unique=True, db_index=True)
    type = models.CharField(max_length=100)  # Duplicate Bill, Budget Violation, Missing Documentation, GST Issue, Large Variance
    reference_no = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    department_id = models.CharField(max_length=50, default='finance')
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    owner_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_financial_exceptions')
    owner_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=30, choices=ExceptionStatus.choices, default=ExceptionStatus.NEW)
    source = models.CharField(max_length=150, default='system')
    trail = models.JSONField(default=list)
    severity = models.CharField(max_length=20, default='High')  # Critical|High|Medium|Low
    linked_ref = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_financial_exceptions'
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['type']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"{self.exception_no} - {self.type} ({self.status})"


class WeeklyFinancialReview(models.Model):
    """Weekly Financial Review summary, departmental spend & risk log (Screen 3.11)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    week_key = models.CharField(max_length=50, unique=True)  # this_week, last_week
    period_range = models.CharField(max_length=100)
    collections_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    payments_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    receivables_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    payables_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    department_spending = models.JSONField(default=list)
    summary_lines = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    shared_with_controller = models.BooleanField(default=False)
    shared_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_weekly_reviews'

    def __str__(self):
        return f"Weekly Review {self.period_range} ({self.week_key})"


# =============================================================================
# SECTION J & K & M: Phase 5 - Finance Controller Models
# =============================================================================

class PeriodReopenRequest(models.Model):
    """Period reopen request with reason and Controller/CFO approval tracking"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period_lock = models.ForeignKey(PeriodLock, on_delete=models.CASCADE, related_name='reopen_requests')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_period_reopens')
    requested_by_name = models.CharField(max_length=150, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, default='pending')  # pending|approved|rejected
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_period_reopens')
    decision_comment = models.TextField(blank=True)
    relocked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_period_reopen_requests'


class PaymentBatch(models.Model):
    """Payment batches awaiting Finance Controller release and dual co-sign"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_no = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    batch_type = models.CharField(max_length=50, default='Vendor')
    source_bank = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_batches')
    source_bank_code = models.CharField(max_length=50, default='B2')
    value_date = models.DateField(null=True, blank=True)
    value_date_label = models.CharField(max_length=50, blank=True)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    item_count = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='Awaiting Release')
    prepared_by_name = models.CharField(max_length=150, blank=True)
    approved_by_name = models.CharField(max_length=150, blank=True)
    released_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='released_payment_batches')
    checks = models.JSONField(default=list)
    ack_text = models.TextField(blank=True)
    items_summary = models.JSONField(default=list)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_payment_batches'

    def __str__(self):
        return f"{self.batch_no} - {self.name} ({self.status})"


class BankReconciliation(models.Model):
    """Bank reconciliation review and sign-off register"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recon_no = models.CharField(max_length=50, unique=True, db_index=True)
    bank_name = models.CharField(max_length=100)
    account_no_masked = models.CharField(max_length=50)
    purpose = models.CharField(max_length=100, blank=True)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciliations')
    period = models.CharField(max_length=20, default='2026-09')
    book_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    statement_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    difference = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=50, default='Unreconciled')
    prepared_by_name = models.CharField(max_length=150, blank=True)
    last_reconciled_label = models.CharField(max_length=50, blank=True)
    exception_ref = models.CharField(max_length=50, blank=True)
    ack_text = models.TextField(blank=True)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_bank_reconciliations'

    def __str__(self):
        return f"{self.recon_no}: {self.bank_name} {self.account_no_masked} ({self.status})"


class FinancialStatement(models.Model):
    """Financial statements (P&L, BS, CF) with tie-outs and audit sign-off"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statement_type = models.CharField(max_length=20, db_index=True)
    name = models.CharField(max_length=100)
    sub_title = models.CharField(max_length=100, blank=True)
    period = models.CharField(max_length=20, default='2026-09')
    status = models.CharField(max_length=50, default='Under Review')
    is_approved = models.BooleanField(default=False)
    tie_outs = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_financial_statements'
        unique_together = ('statement_type', 'period')

    def __str__(self):
        return f"{self.name} - {self.period} ({'Approved' if self.is_approved else 'In Review'})"


class StatementLine(models.Model):
    """Line items for financial statements with prior-period comparison and variance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statement = models.ForeignKey(FinancialStatement, on_delete=models.CASCADE, related_name='lines')
    line_key = models.CharField(max_length=50, db_index=True)
    label = models.CharField(max_length=255)
    line_type = models.CharField(max_length=10, default='l')  # 'h' header, 'l' line, 't' total
    current_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    comparison_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    variance_pct = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('0.00'))
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'accounts_statement_lines'
        ordering = ['sort_order']


class StatementFlag(models.Model):
    """Variance review queries flagged on statement lines requiring explanation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statement_type = models.CharField(max_length=20)
    line_key = models.CharField(max_length=50)
    exception_no = models.CharField(max_length=50)
    query_text = models.TextField()
    raised_by_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, default='Open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_statement_flags'


class TaxReturn(models.Model):
    """GST and TDS returns register with exception gating and filing approval"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_no = models.CharField(max_length=50, unique=True, db_index=True)
    form = models.CharField(max_length=50)
    period = models.CharField(max_length=50)
    due_date = models.CharField(max_length=50)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=50, default='Ready')
    exceptions = models.JSONField(default=list)
    link_exception = models.CharField(max_length=50, blank=True)
    prepared_by_name = models.CharField(max_length=150, blank=True)
    invoice_count = models.IntegerField(default=0)
    ack_text = models.TextField(blank=True)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_tax_returns'

    def __str__(self):
        return f"{self.form} {self.period} ({self.status})"


class ControlViolation(models.Model):
    """Internal control violations detected by automated rule engine (IC-01..IC-07)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    violation_no = models.CharField(max_length=50, unique=True, db_index=True)
    control_name = models.CharField(max_length=150)
    severity = models.CharField(max_length=20, default='High')
    title = models.CharField(max_length=255)
    who = models.CharField(max_length=150, blank=True)
    refs = models.CharField(max_length=255, blank=True)
    exposure_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    detected_date = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=30, default='Open')
    owner = models.CharField(max_length=150, blank=True)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_control_violations'

    def __str__(self):
        return f"{self.violation_no}: {self.title} ({self.status})"


class PolicyMaster(models.Model):
    """Financial policies master governing delegation limits and compliance rules (POL-01..POL-07)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy_no = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=20, default='1.0')
    owner_name = models.CharField(max_length=150)
    next_review = models.CharField(max_length=50)
    status = models.CharField(max_length=30, default='Active')
    change_data = models.JSONField(null=True, blank=True)
    key_values = models.JSONField(default=list)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_policies'

    def __str__(self):
        return f"{self.policy_no}: {self.name} v{self.version} ({self.status})"


class AuditRequest(models.Model):
    """Auditor Provided-By-Client (PBC) evidence checklist items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_no = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    owner = models.CharField(max_length=150)
    due_date = models.CharField(max_length=50)
    status = models.CharField(max_length=30, default='In Progress')
    evidence_files = models.JSONField(default=list)
    note = models.TextField(blank=True)
    trail = models.JSONField(default=list)
    engagement = models.ForeignKey('AuditEngagement', on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    shared_at = models.DateTimeField(null=True, blank=True)
    shared_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_audit_requests')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_audit_requests'

    def __str__(self):
        return f"{self.request_no}: {self.title} ({self.status})"


class AuditObservation(models.Model):
    """Prior-year statutory audit observations and year-end close plans"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obs_no = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.CharField(max_length=150)
    status = models.CharField(max_length=30, default='Open')
    kind = models.CharField(max_length=20, default='obs')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_audit_observations'

    def __str__(self):
        return f"{self.obs_no}: {self.title} ({self.status})"


class QuarterCloseItem(models.Model):
    """Quarter-end close provisions, schedules and audit pack review checklist"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_no = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.CharField(max_length=150)
    status = models.CharField(max_length=30, default='For Review')
    need_ref = models.CharField(max_length=50, blank=True)
    need_statement = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_quarter_close_items'

    def __str__(self):
        return f"{self.item_no}: {self.title} ({self.status})"


class HighRiskItem(models.Model):
    """High-risk and above-limit transactions forwarded to Finance Controller for review"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_no = models.CharField(max_length=50, unique=True, db_index=True)
    ref = models.CharField(max_length=100)
    kind = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    dept = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    risk = models.CharField(max_length=20, default='High')
    why = models.TextField(blank=True)
    recv_date = models.CharField(max_length=50, blank=True)
    key_values = models.JSONField(default=list)
    documents = models.JSONField(default=list)
    ack_text = models.TextField(blank=True)
    status = models.CharField(max_length=50, default='Awaiting Controller')
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_high_risk_items'

    def __str__(self):
        return f"{self.item_no}: {self.ref} - {self.kind} ({self.status})"


# =============================================================================
# SECTION M, N, O: Phase 6 - Chief Financial Officer (CFO) Strategy Models
# =============================================================================

class DebtFacility(models.Model):
    """Hospital debt facilities and capital structure (Screen 6.4 Balance Sheet)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility_no = models.CharField(max_length=50, unique=True, db_index=True)
    lender = models.CharField(max_length=150)
    facility_type = models.CharField(max_length=50, default='term_loan')  # term_loan, working_capital, green_loan
    sanctioned_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    outstanding_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    interest_rate = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    rate_type = models.CharField(max_length=20, default='floating')  # fixed, floating
    covenants = models.JSONField(default=dict)  # {"dscr_min": 1.5, "de_max": 0.8}
    start_date = models.DateField(null=True, blank=True)
    maturity_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_debt_facilities'

    def __str__(self):
        return f"{self.facility_no}: {self.lender} ({self.facility_type})"


class DebtSchedule(models.Model):
    """Debt repayment schedule with principal and interest obligations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility = models.ForeignKey(DebtFacility, on_delete=models.CASCADE, related_name='schedules')
    due_date = models.DateField()
    principal_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    interest_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_debt_schedules'
        ordering = ['due_date']


class ServiceLineMetric(models.Model):
    """Clinical service-line metrics tracking volume, revenue, direct cost and margin (Screen 6.6)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period = models.CharField(max_length=50, default='FY 2026-27 Apr-Sep')
    service_line = models.CharField(max_length=150)
    department_id = models.CharField(max_length=50)
    revenue = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    volume = models.IntegerField(default=0)
    unit = models.CharField(max_length=50, default='scans')
    margin_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    yoy_growth_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    trend = models.CharField(max_length=50, default='Stable')  # Growing, Stable, Declining
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_service_line_metrics'

    def __str__(self):
        return f"{self.service_line} ({self.period})"


class FinancialForecast(models.Model):
    """Forward financial forecast model (Screen 6.8 Financial Forecasting)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    forecast_key = models.CharField(max_length=50, default='FC-2026-Q3')
    horizon = models.CharField(max_length=20, default='12 Months')  # 3 Months, 6 Months, 12 Months, 3 Years
    scenario = models.CharField(max_length=20, default='Expected')  # Best, Expected, Worst
    base_period = models.CharField(max_length=50, default='2026-09')
    assumptions = models.JSONField(default=dict)
    includes_capex_ids = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_financial_forecasts'


class ForecastLine(models.Model):
    """Individual month/quarter projection points within a scenario forecast"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    forecast = models.ForeignKey(FinancialForecast, on_delete=models.CASCADE, related_name='lines')
    period_label = models.CharField(max_length=50)
    quarter = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    expense = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    net_profit = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    closing_cash = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'accounts_forecast_lines'
        ordering = ['sort_order']


class CapexRequest(models.Model):
    """Capital expenditure planning and evaluation (Screen 6.9 CapEx Planning)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True, db_index=True)  # CX-01..CX-07
    name = models.CharField(max_length=255)
    department_id = models.CharField(max_length=100)
    cost = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))  # In Cr (e.g. 14.50)
    roi_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    payback_years = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    npv = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    risk_level = models.CharField(max_length=50, default='Medium')  # Low, Medium, High
    funding_mix = models.CharField(max_length=255, default='100% internal accruals')
    loan_pct = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal('0.00'))
    status = models.CharField(max_length=50, default='Awaiting CFO')  # Awaiting CFO, Analysis Requested, Approved, Board Review, Rejected
    driver = models.TextField(blank=True)
    timeline = models.CharField(max_length=150, blank=True)
    annual_revenue_impact = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    proposed_by = models.CharField(max_length=150, blank=True)
    due_date = models.CharField(max_length=50, blank=True)
    cash_out = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    is_fresh = models.BooleanField(default=False)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_capex_requests'

    def __str__(self):
        return f"{self.reference_no}: {self.name} ({self.status})"


class StrategicApproval(models.Model):
    """Major strategic decisions requiring CFO clearance (Screen 6.10 Strategic Approvals)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True, db_index=True)  # SA-01..SA-07
    approval_type = models.CharField(max_length=100)  # Major Contract, Fund Raising, Hospital Expansion, Equipment Purchase, Related Party
    title = models.CharField(max_length=255)
    value_text = models.CharField(max_length=150)
    annual_impact = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    roi_text = models.CharField(max_length=100, default='—')
    risk_level = models.CharField(max_length=50, default='Medium')
    note = models.TextField(blank=True)
    key_values = models.JSONField(default=list)
    submitted_by = models.CharField(max_length=150, blank=True)
    linked_capex_id = models.CharField(max_length=50, blank=True)
    linked_risk_id = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, default='Awaiting CFO')  # Awaiting CFO, More Info Requested, Approved, Rejected, Board Review
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_strategic_approvals'

    def __str__(self):
        return f"{self.reference_no}: {self.title} ({self.status})"


class GrowthOpportunity(models.Model):
    """Strategic growth opportunity pipeline tracking (Screen 6.12 Growth Opportunities)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True, db_index=True)  # GO-01..GO-06
    title = models.CharField(max_length=255)
    opportunity_type = models.CharField(max_length=100)  # New Specialty, New Branch, New Diagnostic Center, Telemedicine, Medical Tourism
    investment = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    revenue_potential = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    maturity_year = models.IntegerField(default=2)
    irr_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    payback_years = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    risk_level = models.CharField(max_length=50, default='Medium')
    stage = models.CharField(max_length=50, default='Idea')  # Idea, Feasibility, Business Case, Approved, Board Review, Parked, Rejected
    note = models.TextField(blank=True)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_growth_opportunities'

    def __str__(self):
        return f"{self.reference_no}: {self.title} ({self.stage})"


class StrategicRisk(models.Model):
    """Hospital-wide financial and operational strategic risks (Screen 6.13 Strategic Risks)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no = models.CharField(max_length=50, unique=True, db_index=True)  # R1..R9
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    impact = models.IntegerField(default=1)  # 0: Low, 1: Medium, 2: High, 3: Critical
    likelihood = models.IntegerField(default=1)  # 0: Rare, 1: Possible, 2: Likely, 3: Almost Certain
    owner = models.CharField(max_length=150)
    mitigation = models.TextField(blank=True)
    trend = models.CharField(max_length=50, default='Stable')  # Rising, Stable, Falling
    status = models.CharField(max_length=50, default='Monitoring')  # Monitoring, Mitigation Requested, Accepted, With Board
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_strategic_risks'

    def __str__(self):
        return f"{self.reference_no}: {self.title} ({self.status})"

    @property
    def rating(self):
        score = self.impact + self.likelihood
        if score >= 5:
            return 'Critical'
        if score == 4:
            return 'High'
        if score >= 2:
            return 'Medium'
        return 'Low'


class ExecutiveAlert(models.Model):
    """High-level executive financial alerts (Screen 6.14 Financial Alerts)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert_no = models.CharField(max_length=50, unique=True, db_index=True)  # AL-01..AL-06
    alert_type = models.CharField(max_length=100)  # Cash Crisis, Loss-Making Department, Budget Overrun, Target Miss, Receivable Concentration, Revenue Drop
    severity = models.CharField(max_length=50, default='High')  # Critical, High, Medium, Low
    title = models.CharField(max_length=255)
    detail = models.TextField(blank=True)
    target_screen = models.CharField(max_length=50, default='cash')
    status = models.CharField(max_length=50, default='Open')  # Open, Acknowledged, Assigned, In Board Pack, Closed
    assigned_to = models.CharField(max_length=150, blank=True)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_executive_alerts'

    def __str__(self):
        return f"{self.alert_no}: {self.title} ({self.severity})"


class BoardReport(models.Model):
    """Board meeting financial pack and deck generation (Screen 6.11 Board Reporting)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting_date = models.CharField(max_length=100, default='24 Oct 2026')
    period = models.CharField(max_length=100, default='Q2 FY 2026-27')
    status = models.CharField(max_length=50, default='Draft')  # Draft, Approved, Circulated
    sections_included = models.JSONField(default=dict)  # {"rev": True, "prof": True, "cash": True, "growth": True, "risk": True}
    headlines = models.JSONField(default=list)
    exports = models.JSONField(default=list)
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_board_reports'

    def __str__(self):
        return f"Board Pack {self.period} - Meeting {self.meeting_date} ({self.status})"


class ExecutiveDecision(models.Model):
    """Executive decision audit log with rationale and financial impact (Screen 6.15 Executive Decisions)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision_no = models.CharField(max_length=50, blank=True)
    decided_date = models.CharField(max_length=50)
    category = models.CharField(max_length=50)  # Investment, CapEx, Budget, Expansion, Contract, Risk, Funding
    title = models.CharField(max_length=255)
    outcome = models.CharField(max_length=50)  # Approved, Rejected, Deferred, Referred to Board, Requested, Revision Requested
    reason = models.TextField(blank=True)
    impact_text = models.CharField(max_length=255, blank=True)
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id = models.CharField(max_length=100, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executive_decisions')
    decided_by_name = models.CharField(max_length=150, blank=True)
    is_fresh = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_executive_decisions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.decided_date} [{self.category}] {self.title} - {self.outcome}"


class CfoDirective(models.Model):
    """CFO directive dispatched to departments or controllers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    directive_type = models.CharField(max_length=50)  # turnaround_plan, board_pack_item, analysis
    department_id = models.CharField(max_length=100)
    message = models.TextField()
    addressed_to = models.CharField(max_length=150)
    due_date = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, default='Open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_cfo_directives'

    def __str__(self):
        return f"{self.directive_type} for {self.department_id} ({self.status})"


class BudgetStrategyProposal(models.Model):
    """Annual budget strategy proposal from Controller to CFO (Screen 6.7 Budget Strategy)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiscal_year = models.CharField(max_length=50, default='FY 2027-28')
    status = models.CharField(max_length=50, default='Awaiting CFO')  # Awaiting CFO, Approved, Revision Requested
    revenue_target = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('288.00'))
    ebitda_target = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('70.50'))
    net_profit_target = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('47.00'))
    capex_budget = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('46.00'))
    trail = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_budget_strategy_proposals'

    def __str__(self):
        return f"Budget Strategy {self.fiscal_year} ({self.status})"


# =============================================================================
# SECTION P: Phase 9 - OPD & IPD Integration Models
# =============================================================================

class IPDUnbilledTracker(models.Model):
    """Tracks running unbilled revenue for in-house IPD admissions (Phase 9 #16, #17, #18)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission_id = models.CharField(max_length=100, unique=True, db_index=True)
    admission_number = models.CharField(max_length=50, blank=True)
    patient_uhid = models.CharField(max_length=50, db_index=True)
    patient_name = models.CharField(max_length=150)
    ward_name = models.CharField(max_length=100, blank=True)
    bed_number = models.CharField(max_length=50, blank=True)
    payer_type = models.CharField(max_length=50, default='cash')  # cash|insurance|tpa|corporate
    package_id = models.CharField(max_length=50, blank=True)
    total_running_charges = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    unbilled_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    total_deposits_held = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    last_charge_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, default='ACTIVE')  # ACTIVE|DISCHARGE_INITIATED|BILLED|CLOSED
    final_invoice_no = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_ipd_unbilled_trackers'
        indexes = [
            models.Index(fields=['status', 'patient_uhid']),
        ]

    def __str__(self):
        return f"Unbilled Tracker {self.admission_number}: ₹{self.unbilled_balance} ({self.status})"


class ConsultantShareBatch(models.Model):
    """Doctor and visiting consultant fee accrual batch (Phase 9 #15)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_no = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    department_id = models.CharField(max_length=50, default='OPD')
    period_from = models.DateField()
    period_to = models.DateField()
    doctor_count = models.IntegerField(default=0)
    total_gross_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    total_tds_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    total_net_payable = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='draft')  # draft|submitted|under_review|approved|posted|paid
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.SET_NULL, null=True, blank=True)
    journal = models.ForeignKey(Journal, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_consultant_batches')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_consultant_share_batches'

    def __str__(self):
        return f"{self.batch_no} - {self.title} (₹{self.total_gross_amount})"


class ConsultantShareItem(models.Model):
    """Individual doctor payout line in a consultant share batch"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(ConsultantShareBatch, on_delete=models.CASCADE, related_name='items')
    doctor_id = models.CharField(max_length=100)
    doctor_name = models.CharField(max_length=150)
    specialty = models.CharField(max_length=100, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    pan_aadhaar_linked = models.BooleanField(default=True)
    case_count = models.IntegerField(default=1)
    gross_amount = models.DecimalField(max_digits=18, decimal_places=2)
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))
    tds_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    net_payable = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = 'accounts_consultant_share_items'

    def __str__(self):
        return f"{self.doctor_name} - ₹{self.net_payable} (Gross ₹{self.gross_amount})"


class OTImplantUsageRegister(models.Model):
    """Cath lab & OT implant usage log tied to patient surgeries (Phase 9)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usage_no = models.CharField(max_length=50, unique=True, db_index=True)
    patient_uhid = models.CharField(max_length=50)
    patient_name = models.CharField(max_length=150)
    admission_number = models.CharField(max_length=50, blank=True)
    procedure_name = models.CharField(max_length=255)
    theater_type = models.CharField(max_length=50, default='cath_lab')  # cath_lab|general_ot|cardiac_ot
    implant_name = models.CharField(max_length=255)
    implant_serial_no = models.CharField(max_length=100, blank=True)
    batch_no = models.CharField(max_length=50, blank=True)
    vendor_name = models.CharField(max_length=150, default='Medline Surgicals Pvt Ltd')
    unit_cost = models.DecimalField(max_digits=18, decimal_places=2)
    quantity = models.IntegerField(default=1)
    used_at = models.DateTimeField()
    surgeon_name = models.CharField(max_length=150, blank=True)
    is_matched_to_invoice = models.BooleanField(default=False)
    vendor_bill = models.ForeignKey(VendorBill, on_delete=models.SET_NULL, null=True, blank=True, related_name='implant_usages')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_ot_implant_usages'

    def __str__(self):
        return f"{self.usage_no}: {self.implant_name} ({self.patient_uhid})"


class OTImplantConsignmentMatch(models.Model):
    """3-Way reconciliation between Consignment PO, Usage Register, and Vendor Invoice (IA-04)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_bill = models.OneToOneField(VendorBill, on_delete=models.CASCADE, related_name='implant_consignment_match')
    po_no = models.CharField(max_length=50, blank=True)
    implant_name = models.CharField(max_length=255)
    invoiced_quantity = models.IntegerField()
    usage_count = models.IntegerField()
    variance_count = models.IntegerField(default=0)
    match_status = models.CharField(max_length=30, default='matched')  # matched|quantity_mismatch|price_variance
    details = models.JSONField(default=dict)
    matched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_ot_consignment_matches'

    def __str__(self):
        return f"Consignment Match {self.vendor_bill.reference_no} ({self.match_status})"



# =============================================================================
# SECTION N: Laboratory & Radiology Integration (Phase 10)
# =============================================================================

class OutsourcedTestAccrual(models.Model):
    """One outsourced test sent to a partner lab (event #19), accrued daily and cleared by the partner invoice"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requisition_no = models.CharField(max_length=50, unique=True, db_index=True)
    partner_lab = models.CharField(max_length=150, db_index=True)
    department_id = models.CharField(max_length=50, default='Laboratory')  # Laboratory|Radiology
    service_line = models.CharField(max_length=150, default='Pathology')
    test_code = models.CharField(max_length=50, blank=True)
    test_name = models.CharField(max_length=255)
    patient_uhid = models.CharField(max_length=50, blank=True)
    cost = models.DecimalField(max_digits=18, decimal_places=2)
    business_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, default='pending_batch')  # pending_batch|accrued|matched
    financial_event = models.ForeignKey('FinancialEvent', on_delete=models.SET_NULL, null=True, blank=True)
    accrual_journal = models.ForeignKey('Journal', on_delete=models.SET_NULL, null=True, blank=True, related_name='outsourced_test_accruals')
    vendor_bill = models.ForeignKey('VendorBill', on_delete=models.SET_NULL, null=True, blank=True, related_name='outsourced_test_accruals')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_outsourced_test_accruals'
        indexes = [models.Index(fields=['partner_lab', 'status', 'business_date'])]

    def __str__(self):
        return f"{self.requisition_no}: {self.test_name} ({self.partner_lab})"


class LabPartnerInvoiceMatch(models.Model):
    """Partner-lab monthly invoice matched to accrued requisitions (count and amount)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_bill = models.OneToOneField('VendorBill', on_delete=models.CASCADE, related_name='lab_invoice_match')
    partner_lab = models.CharField(max_length=150)
    period_from = models.DateField()
    period_to = models.DateField()
    invoiced_count = models.IntegerField()
    invoiced_amount = models.DecimalField(max_digits=18, decimal_places=2)
    accrued_count = models.IntegerField()
    accrued_amount = models.DecimalField(max_digits=18, decimal_places=2)
    count_variance = models.IntegerField(default=0)
    amount_variance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    match_status = models.CharField(max_length=30)  # matched|price_variance|count_mismatch|accrual_unposted
    exception_no = models.CharField(max_length=50, blank=True)
    details = models.JSONField(default=dict)
    matched_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_lab_partner_invoice_matches'

    def __str__(self):
        return f"Lab invoice match {self.vendor_bill.reference_no} ({self.match_status})"


class ServiceLineVolume(models.Model):
    """Nightly per-day service-line volumes for Laboratory and Radiology (feed into ServiceLineMetric)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_date = models.DateField(db_index=True)
    department_id = models.CharField(max_length=50)
    service_line = models.CharField(max_length=150)
    unit = models.CharField(max_length=50, default='tests')
    volume = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    outsourced_volume = models.IntegerField(default=0)
    outsourced_cost = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_service_line_volumes'
        unique_together = ('business_date', 'department_id', 'service_line')

    def __str__(self):
        return f"{self.business_date} {self.service_line}: {self.volume} {self.unit}"


# =============================================================================
# SECTION O: Audit & Compliance (Phase 11)
# =============================================================================

class AuditEngagement(models.Model):
    """An audit (statutory, internal, tax, NABH) with its fieldwork window"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement_no = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20, default='statutory')  # statutory|internal|tax|nabh
    auditor_firm = models.CharField(max_length=150)
    period_from = models.DateField()
    period_to = models.DateField()
    fieldwork_from = models.DateField()
    fieldwork_to = models.DateField()
    status = models.CharField(max_length=20, default='active')  # planned|active|closed
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_audit_engagements')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_audit_engagements'

    def __str__(self):
        return f"{self.engagement_no} · {self.auditor_firm}"


class AuditorAccessGrant(models.Model):
    """Time-boxed, read-only access for an auditor user to one engagement"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(AuditEngagement, on_delete=models.PROTECT, related_name='grants')
    auditor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='auditor_grants')
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    granted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='issued_auditor_grants')
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='revoked_auditor_grants')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_auditor_access_grants'
        indexes = [models.Index(fields=['auditor', 'valid_until'])]

    def is_active(self, at=None) -> bool:
        at = at or timezone.now()
        return self.revoked_at is None and self.valid_from <= at <= self.valid_until


class ControlDefinition(models.Model):
    """Automated internal control rule (IC-01..IC-08) and its last monitor run"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    severity_default = models.CharField(max_length=20, default='High')
    frequency = models.CharField(max_length=20, default='daily')  # realtime|hourly|daily
    active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_checked_count = models.IntegerField(default=0)
    last_violation_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'accounts_control_definitions'
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.name}"


class AuditWormExport(models.Model):
    """Daily write-once export of audit records; each export chains to the previous one"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    export_date = models.DateField(unique=True)
    from_sequence = models.PositiveBigIntegerField(null=True, blank=True)
    to_sequence = models.PositiveBigIntegerField(null=True, blank=True)
    record_count = models.IntegerField(default=0)
    file_path = models.CharField(max_length=500)
    file_sha256 = models.CharField(max_length=64)
    previous_export_sha256 = models.CharField(max_length=64, blank=True)
    chain_valid = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_audit_worm_exports'
        ordering = ['-export_date']


class RetentionPolicy(models.Model):
    """Statutory retention per record type (Companies Act / GST / Income-tax: 8 years)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record_type = models.CharField(max_length=50, unique=True)
    retain_years = models.IntegerField(default=8)
    basis = models.CharField(max_length=255, blank=True)
    purge_allowed = models.BooleanField(default=False)
    legal_hold = models.BooleanField(default=False)

    class Meta:
        db_table = 'accounts_retention_policies'
        ordering = ['record_type']

