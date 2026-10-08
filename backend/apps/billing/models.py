import hashlib
import uuid
from datetime import date as _date, datetime as _datetime
from decimal import Decimal
from django.db import models
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from apps.patients.models import Patient
from apps.accounts.models import User
from apps.ipd.models import InpatientAdmission

class InvoiceStatus(models.TextChoices):
    # Cashier work-in-progress: not a fiscal document, carries a DRF- number until finalised at collection
    DRAFT = 'DRAFT', 'Draft'
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    PAID = 'PAID', 'Paid'
    INSURANCE_PENDING = 'INSURANCE_PENDING', 'Insurance Pending'
    CORPORATE_PENDING = 'CORPORATE_PENDING', 'Corporate Pending'
    CREDIT_AUTHORIZED = 'CREDIT_AUTHORIZED', 'Credit Authorized'
    CANCELLED = 'CANCELLED', 'Cancelled'
    REFUNDED = 'REFUNDED', 'Refunded'

class InvoiceCategory(models.TextChoices):
    OPD = 'OPD', 'OPD'
    IPD = 'IPD', 'IPD'
    OT = 'OT', 'OT'
    LAB = 'LAB', 'LAB'
    PACKAGE = 'PACKAGE', 'PACKAGE'
    PHARMACY = 'PHARMACY', 'Pharmacy'
    EMERGENCY = 'EMERGENCY', 'Emergency'
    RADIOLOGY = 'RADIOLOGY', 'Radiology'
    GENERAL = 'GENERAL', 'General'

class TenderMode(models.TextChoices):
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Credit / Debit Card'
    UPI = 'UPI', 'UPI / QR'
    NETBANKING = 'NETBANKING', 'Netbanking'
    CHEQUE = 'CHEQUE', 'Cheque'
    DEPOSIT_DEDUCTION = 'DEPOSIT_DEDUCTION', 'Advance Deposit Deduction'
    INSURANCE_TPA = 'INSURANCE_TPA', 'Insurance / TPA Cashless'
    CORPORATE_CREDIT = 'CORPORATE_CREDIT', 'Corporate Credit Sponsorship'

class CounterStationLocation(models.TextChoices):
    OPD_LOBBY = 'OPD_LOBBY', 'Main OPD Lobby'
    EMERGENCY = 'EMERGENCY', 'Emergency & Trauma Desk'
    IPD_DESK = 'IPD_DESK', 'Inpatient & Discharge Lounge'
    DIAGNOSTICS = 'DIAGNOSTICS', 'Diagnostics & Lab Billing'
    PHARMACY = 'PHARMACY', 'Pharmacy Cash Counter'

class ShiftStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Supervisor Approval'
    UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'Variance Under Investigation'
    CLOSED = 'CLOSED', 'Closed & Reconciled'


class VarianceStatus(models.TextChoices):
    GREEN_MATCH = 'GREEN_MATCH', 'Matched'
    RED_VARIANCE = 'RED_VARIANCE', 'Variance'


class TallyType(models.TextChoices):
    OPENING_FLOAT = 'OPENING_FLOAT', 'Opening Float'
    CLOSING_COUNT = 'CLOSING_COUNT', 'Closing Count'


class PickupReason(models.TextChoices):
    THRESHOLD_LIMIT_EXCEEDED = 'THRESHOLD_LIMIT_EXCEEDED', 'Drawer Threshold Exceeded'
    ROUTINE_SWEEP = 'ROUTINE_SWEEP', 'Routine Sweep'


class PickupStatus(models.TextChoices):
    REQUESTED = 'REQUESTED', 'Requested by Cashier'
    COMPLETED = 'COMPLETED', 'Collected by Supervisor'

class DepositStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active / Available'
    PARTIALLY_UTILIZED = 'PARTIALLY_UTILIZED', 'Partially Utilized'
    EXHAUSTED = 'EXHAUSTED', 'Fully Exhausted'
    REFUNDED = 'REFUNDED', 'Refunded'

class RefundStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Supervisor Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    ESCALATED = 'ESCALATED', 'Escalated to Billing Admin'
    DISBURSED = 'DISBURSED', 'Disbursed / Credit Note Issued'

class DischargeClearanceStatus(models.TextChoices):
    PENDING_SETTLEMENT = 'PENDING_SETTLEMENT', 'Pending Settlement'
    DISPUTED = 'DISPUTED', 'Disputed / Under Audit'
    CLEARED = 'CLEARED', 'Financial Discharge Cleared'
    OVERRIDDEN = 'OVERRIDDEN', 'Admin / Charity Override'

class ChargeItemStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    INVOICED = 'INVOICED', 'Invoiced'
    CANCELLED = 'CANCELLED', 'Cancelled'

class DepartmentChargeEventStatus(models.TextChoices):
    QUEUED = 'QUEUED', 'Queued'
    INVOICED = 'INVOICED', 'Invoiced'
    CANCELLED = 'CANCELLED', 'Cancelled'

class GatingAction(models.TextChoices):
    LAB_SAMPLE_COLLECTION = 'LAB_SAMPLE_COLLECTION', 'Lab Sample Collection'
    PHARMACY_MEDICINE_RELEASE = 'PHARMACY_MEDICINE_RELEASE', 'Pharmacy Medicine Release'
    IPD_DISCHARGE_EXIT = 'IPD_DISCHARGE_EXIT', 'IPD Discharge Exit'
    CONSULTATION_ENTRY = 'CONSULTATION_ENTRY', 'Consultation Entry'

class ReceiptType(models.TextChoices):
    THERMAL_80MM = 'THERMAL_80MM', '80mm Thermal Slip'
    A4_TAX_INVOICE = 'A4_TAX_INVOICE', 'A4 Formal Tax Invoice'

# --- Phase 11: financial period locks ---

class FinancialPeriodLocked(PermissionDenied):
    """403 raised when a transaction would be created in, or an existing one changed inside, a LOCKED period."""
    default_detail = 'Financial Period Locked'
    default_code = 'financial_period_locked'


def transaction_date(value):
    """Local business date of a date, datetime or 'YYYY-MM-DD' string (None stays None)."""
    if value in (None, ''):
        return None
    if isinstance(value, _datetime):
        return timezone.localtime(value).date() if timezone.is_aware(value) else value.date()
    if isinstance(value, _date):
        return value
    try:
        return _date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def assert_period_open(on_date, action: str):
    lock = FinancialPeriodLock.locking(transaction_date(on_date))
    if lock is not None:
        raise FinancialPeriodLocked(
            f'Financial Period Locked: {lock.period_name} is closed, so {action}. '
            'Post a correction in the open period with a reference to the original.'
        )


def _guard_existing(model, pk, date_field, action):
    """Updating a record whose business date falls in a locked period is refused."""
    original = model.objects.filter(pk=pk).values_list(date_field, flat=True).first()
    if original is not None:
        assert_period_open(original, action)


# Phase 5: cash receipts at or above this amount are flagged on the supervisor audit stream
HIGH_VALUE_CASH_THRESHOLD = Decimal('40000.00')


def _tag_assist(obj):
    """Counter mode: a transaction posted on someone else's shift records the poster as `assisted_by`."""
    if obj.assisted_by_id is None and obj.shift_id and obj.cashier_id and obj.shift.cashier_id != obj.cashier_id:
        obj.assisted_by_id = obj.cashier_id


def _flag_high_value_cash(obj, amount, reference, kind):
    if obj.tender_mode != TenderMode.CASH or amount is None or Decimal(str(amount)) < HIGH_VALUE_CASH_THRESHOLD:
        return
    who = obj.patient
    BillingAuditEvent.objects.create(
        event_type=AuditEventType.HIGH_VALUE_CASH, severity=AuditSeverity.HIGH,
        title='High-value cash receipt',
        detail=f"₹{Decimal(str(amount)):,.2f} cash {kind}" + (f" · {who.first_name} {who.last_name}".rstrip() if who else '') + ' · PAN required',
        counter_id=obj.counter_id, shift_id=obj.shift_id, actor_id=obj.cashier_id, reference=reference or ''
    )


class BillingCounter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    station_location = models.CharField(
        max_length=30,
        choices=CounterStationLocation.choices,
        default=CounterStationLocation.OPD_LOBBY
    )
    is_active = models.BooleanField(default=True)
    ip_terminal_binding = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_counters'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_station_location_display()})"

class CounterShift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    counter = models.ForeignKey(BillingCounter, on_delete=models.CASCADE, related_name='shifts')
    cashier = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billing_shifts')
    opening_float = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    opening_time = models.DateTimeField(auto_now_add=True)
    closing_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=ShiftStatus.choices, default=ShiftStatus.OPEN)
    
    # Reconciliation & Handover
    denominations_submitted = models.JSONField(default=dict, blank=True)
    card_settlement_batch_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    upi_settlement_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    physical_cash_count = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    system_expected_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    variance_note = models.TextField(blank=True, default='')
    
    supervisor_sign_off_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='signed_billing_shifts'
    )
    supervisor_signed_at = models.DateTimeField(null=True, blank=True)

    # Phase 4: three-tender reconciliation, supervisor review and vault custody
    system_expected_card = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    system_expected_upi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    card_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    upi_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    variance_status = models.CharField(max_length=20, choices=VarianceStatus.choices, blank=True, default='')
    closing_submitted_at = models.DateTimeField(null=True, blank=True)
    supervisor_finding = models.TextField(blank=True, default='')
    investigation_number = models.CharField(max_length=30, blank=True, default='', db_index=True)
    closed_with_variance = models.BooleanField(default=False)
    vault_handover = models.ForeignKey(
        'VaultHandover', on_delete=models.SET_NULL, null=True, blank=True, related_name='shifts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_counter_shifts'
        ordering = ['-opening_time']

    def __str__(self):
        return f"Shift {self.counter.code} - {self.cashier.get_full_name() or self.cashier.username} ({self.status})"

class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='invoices')
    category = models.CharField(max_length=20, choices=InvoiceCategory.choices, default=InvoiceCategory.OPD)
    encounter_type = models.CharField(max_length=20, default='OPD')
    date = models.CharField(max_length=20)
    
    # Financial fields
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    advance_deducted = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, choices=InvoiceStatus.choices, default=InvoiceStatus.UNPAID)
    settlement_mode = models.CharField(max_length=30, blank=True, null=True)
    
    # Audit & Tracking
    token_slip_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    tpa_claim_reference = models.CharField(max_length=100, blank=True, null=True)
    corporate_reference = models.CharField(max_length=100, blank=True, null=True)
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cashier_invoices')
    shift = models.ForeignKey(CounterShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    # Phase 5 counter mode: supervisor who posted this on another cashier's shift
    assisted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assisted_invoices')

    # Discount Governance
    discount_reason = models.CharField(max_length=255, blank=True, default='')
    discount_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_discounts'
    )
    
    # Cancellation Governance
    cancellation_reason = models.TextField(blank=True, default='')
    cancelled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_invoices'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']

    # Fields that make up the posted ledger entry; they freeze once the invoice's period is locked
    LEDGER_FIELDS = ('invoice_number', 'patient_id', 'category', 'date', 'subtotal', 'discount', 'tax', 'advance_deducted', 'total')

    def business_date(self):
        return transaction_date(self.date) or transaction_date(self.created_at) or timezone.localdate()

    def save(self, *args, **kwargs):
        _tag_assist(self)
        if self._state.adding:
            assert_period_open(self.business_date(), f'invoice {self.invoice_number or ""} cannot be dated in it'.replace('  ', ' '))
        else:
            original = Invoice.objects.filter(pk=self.pk).values(*self.LEDGER_FIELDS, 'status', 'created_at').first()
            if original:
                d = transaction_date(original['date']) or transaction_date(original['created_at'])
                changed = [f for f in self.LEDGER_FIELDS if getattr(self, f) != original[f]]
                voided = self.status in (InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT) and original['status'] != self.status
                if changed or voided:
                    assert_period_open(d, f'invoice {self.invoice_number} cannot be ' + ('voided' if voided else 'edited'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invoice {self.invoice_number} ({self.status}) - ₹{self.total}"

class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    source = models.CharField(max_length=50, default='Consultation')
    department = models.CharField(max_length=50, default='GENERAL')
    service_code = models.CharField(max_length=50, blank=True, default='')
    description = models.CharField(max_length=255)
    qty = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    source_reference_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'invoice_items'

    def _assert_invoice_open(self, action):
        inv = Invoice.objects.filter(pk=self.invoice_id).values('date', 'created_at', 'invoice_number').first()
        if inv:
            assert_period_open(transaction_date(inv['date']) or transaction_date(inv['created_at']),
                               f"lines on {inv['invoice_number']} cannot be {action}")

    def save(self, *args, **kwargs):
        self._assert_invoice_open('changed')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        self._assert_invoice_open('removed')
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.description} (₹{self.total})"

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    payment_number = models.CharField(max_length=50, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, default='CASH')
    tender_mode = models.CharField(max_length=30, choices=TenderMode.choices, default=TenderMode.CASH)
    transaction_reference = models.CharField(max_length=100, blank=True, null=True)
    
    # Specific tender details
    card_network = models.CharField(max_length=50, blank=True, null=True)
    card_last_four = models.CharField(max_length=4, blank=True, null=True)
    auth_code = models.CharField(max_length=50, blank=True, null=True)
    upi_vpa = models.CharField(max_length=100, blank=True, null=True)
    cheque_number = models.CharField(max_length=50, blank=True, null=True)
    cheque_bank = models.CharField(max_length=100, blank=True, null=True)
    
    payment_status = models.CharField(max_length=30, default='SUCCESS')
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    shift = models.ForeignKey(CounterShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    assisted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assisted_payments')
    payment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new:
            assert_period_open(self.payment_date or timezone.localdate(), 'payments cannot be posted in it')
        else:
            _guard_existing(Payment, self.pk, 'payment_date', f'payment {self.payment_number} cannot be edited')
        _tag_assist(self)
        super().save(*args, **kwargs)
        if is_new:
            _flag_high_value_cash(self, self.amount, self.payment_number, 'payment')

    def __str__(self):
        return f"Payment {self.payment_number}: ₹{self.amount} via {self.tender_mode}"

class PatientDeposit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deposit_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='deposits')
    ipd_admission = models.ForeignKey(
        InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='deposits'
    )
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    utilized_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    available_balance = models.DecimalField(max_digits=12, decimal_places=2)
    tender_mode = models.CharField(max_length=30, choices=TenderMode.choices, default=TenderMode.CASH)
    transaction_reference = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=30, choices=DepositStatus.choices, default=DepositStatus.ACTIVE)
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True)
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    # Phase 4: drawer that received this deposit (cash deposits are drawer cash)
    shift = models.ForeignKey('CounterShift', on_delete=models.SET_NULL, null=True, blank=True, related_name='deposits')
    assisted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assisted_deposits')
    receipt_printed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_deposits'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new:
            assert_period_open(self.created_at or timezone.localdate(), 'deposits cannot be received in it')
        _tag_assist(self)
        super().save(*args, **kwargs)
        if is_new:
            _flag_high_value_cash(self, self.deposit_amount, self.deposit_number, 'deposit')

    def __str__(self):
        return f"Deposit {self.deposit_number} - ₹{self.deposit_amount} (Avail: ₹{self.available_balance})"

class RefundRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='refund_requests')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='refund_requests')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='refund_requests')
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255)
    clinical_justification = models.TextField(blank=True, default='')
    status = models.CharField(max_length=30, choices=RefundStatus.choices, default=RefundStatus.PENDING)
    
    initiated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_refunds')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_refunds')
    approved_at = models.DateTimeField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    disbursed_tender = models.CharField(max_length=30, blank=True, null=True)
    rejection_reason = models.TextField(blank=True, default='')
    credit_note_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    # Phase 4: drawer that paid out a cash refund (feeds expected-cash reconciliation)
    disbursed_shift = models.ForeignKey('CounterShift', on_delete=models.SET_NULL, null=True, blank=True, related_name='cash_refunds')
    # Phase 5: supervisor review
    requested_shift = models.ForeignKey('CounterShift', on_delete=models.SET_NULL, null=True, blank=True, related_name='raised_refunds')
    refund_items = models.JSONField(default=list, blank=True)
    original_tender = models.CharField(max_length=30, blank=True, default='')
    review_notes = models.TextField(blank=True, default='')
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.CharField(max_length=20, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'refund_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund {self.refund_number}: ₹{self.requested_amount} ({self.status})"

class TariffMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    department = models.CharField(max_length=50, default='GENERAL')
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    emergency_markup_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)
    # Phase 6: the clinical department that owns the service definition and proposes its price changes
    owner_department = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tariff_masters'
        ordering = ['department', 'name']

    def __str__(self):
        return f"{self.code} - {self.name} (₹{self.base_price})"

class PackageStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    ACTIVE = 'ACTIVE', 'Active'
    RETIRED = 'RETIRED', 'Retired'


class ServicePackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    package_price = models.DecimalField(max_digits=12, decimal_places=2)
    department = models.CharField(max_length=50, default='SURGERY')
    inclusions_description = models.TextField(blank=True, default='')
    exclusions_description = models.TextField(blank=True, default='')
    validity_days = models.IntegerField(default=7)
    is_active = models.BooleanField(default=True)
    # Phase 6: definition lifecycle (only ACTIVE packages are selectable at admission)
    status = models.CharField(max_length=20, default='ACTIVE', db_index=True)
    effective_from = models.DateField(null=True, blank=True)
    length_of_stay_days = models.PositiveIntegerField(default=0)
    overrun_rule = models.TextField(blank=True, default='')
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_packages')
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_packages'
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.is_active = self.status == PackageStatus.ACTIVE
        if kwargs.get('update_fields') is not None and 'status' in kwargs['update_fields']:
            kwargs['update_fields'] = list(set(kwargs['update_fields']) | {'is_active'})
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name} (₹{self.package_price})"

class CorporateAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=30, default='CORPORATE') # CORPORATE or TPA_INSURANCE
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100000.00'))
    utilized_credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    co_pay_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    deductible_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    room_rent_ceiling = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('5000.00'))
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    settlement_tat_days = models.IntegerField(default=30)
    contract_reference = models.CharField(max_length=100, blank=True, default='')
    tariff_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    contact_person = models.CharField(max_length=100, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    contact_phone = models.CharField(max_length=30, blank=True, default='')
    billing_cycle = models.CharField(max_length=100, blank=True, default='Monthly · 30-day credit')
    plans_data = models.JSONField(default=list, blank=True)
    required_docs = models.JSONField(default=list, blank=True)
    signatories = models.JSONField(default=list, blank=True)
    covered_services = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'corporate_accounts'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.account_type})"

    @property
    def available_credit(self) -> Decimal:
        return max(Decimal('0.00'), self.credit_limit - self.utilized_credit)

    @property
    def utilization_percentage(self) -> float:
        if not self.credit_limit or self.credit_limit <= Decimal('0.00'):
            return 0.0
        return round(float((self.utilized_credit / self.credit_limit) * 100), 1)


class PreAuthStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    QUERY_RAISED = 'QUERY_RAISED', 'Query Raised'
    REJECTED = 'REJECTED', 'Rejected'
    PARTIAL = 'PARTIAL', 'Partially Approved'


class ClaimLifecycleStatus(models.TextChoices):
    PRE_AUTH = 'PRE_AUTH', 'Pre-Auth'
    CLAIM_FILED = 'CLAIM_FILED', 'Claim Filed'
    APPROVED = 'APPROVED', 'Approved'
    SETTLED = 'SETTLED', 'Settled'
    DENIED = 'DENIED', 'Denied'


class TPAClaimRecord(models.Model):
    """Phase 8 - Cashless claim lifecycle management & pre-auth tracking."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim_number = models.CharField(max_length=50, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='tpa_claims')
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='tpa_claims')
    corporate_account = models.ForeignKey(CorporateAccount, on_delete=models.PROTECT, related_name='tpa_claims')
    policy_number = models.CharField(max_length=100)
    tpa_member_id = models.CharField(max_length=100)

    # Financials & Pre-Auth
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pre_auth_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    enhancement_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pre_auth_status = models.CharField(max_length=30, choices=PreAuthStatus.choices, default=PreAuthStatus.PENDING)
    gop_letter_number = models.CharField(max_length=100, blank=True, default='')

    # Admissibility, Co-Pay & Deductibles
    non_medical_deductibles = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    copay_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    room_rent_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Claim settlement
    claim_status = models.CharField(max_length=30, choices=ClaimLifecycleStatus.choices, default=ClaimLifecycleStatus.PRE_AUTH)
    settled_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    deduction_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    denial_reason = models.TextField(blank=True, default='')

    # Operational & Dossier context
    source = models.CharField(max_length=100, default='IPD')
    plan_name = models.CharField(max_length=100, blank=True, default='')
    dossier_data = models.JSONField(default=dict, blank=True)
    tracking_notes = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tpa_claim_records'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.claim_number} · {self.patient.first_name} {self.patient.last_name} ({self.corporate_account.name} - {self.pre_auth_status})"


class CorporateCreditVoucher(models.Model):
    """Phase 8 - Corporate credit authorization vouchers & employee entitlement."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher_number = models.CharField(max_length=50, unique=True, db_index=True)
    corporate_account = models.ForeignKey(CorporateAccount, on_delete=models.PROTECT, related_name='credit_vouchers')
    employee_id = models.CharField(max_length=100)
    employee_name = models.CharField(max_length=150, blank=True, default='')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='corporate_vouchers')
    relationship = models.CharField(max_length=50, default='SELF')
    approved_credit_ceiling = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    utilized_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    validity_date = models.DateField()
    is_verified = models.BooleanField(default=True)
    verified_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='verified_corporate_vouchers')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'corporate_credit_vouchers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.voucher_number} · {self.employee_id} ({self.corporate_account.name} - ₹{self.approved_credit_ceiling})"

    @property
    def remaining_headroom(self) -> Decimal:
        return max(Decimal('0.00'), self.approved_credit_ceiling - self.utilized_amount)

class FinancialDischargeClearance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission = models.OneToOneField(InpatientAdmission, on_delete=models.CASCADE, related_name='discharge_clearance')
    final_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='discharge_clearances')
    clearance_status = models.CharField(
        max_length=30,
        choices=DischargeClearanceStatus.choices,
        default=DischargeClearanceStatus.PENDING_SETTLEMENT
    )
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    deposit_applied = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    insurance_covered = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    patient_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cleared_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cleared_discharges')
    cleared_at = models.DateTimeField(null=True, blank=True)
    qr_verification_token = models.CharField(max_length=100, unique=True, db_index=True)
    override_reason = models.TextField(blank=True, default='')
    checklist_confirmed = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'financial_discharge_clearances'

    def __str__(self):
        return f"Clearance for {self.admission.admission_number}: {self.clearance_status}"


class BillableChargeItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='billable_charges')
    department = models.CharField(max_length=50, default='GENERAL')
    service_code = models.CharField(max_length=50, blank=True, default='')
    service_name = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    quantity = models.IntegerField(default=1)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    source_reference_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    priority = models.CharField(max_length=20, default='ROUTINE', db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ChargeItemStatus.choices,
        default=ChargeItemStatus.PENDING,
        db_index=True
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='charge_items'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_charge_items'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.service_name} ({self.department}) - ₹{self.total_amount} [{self.status}]"


class BillingReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='receipts')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='billing_receipts')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts')
    receipt_type = models.CharField(
        max_length=30,
        choices=ReceiptType.choices,
        default=ReceiptType.A4_TAX_INVOICE
    )
    token_slip_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_receipts'
    )
    qr_verification_token = models.CharField(max_length=255, unique=True, db_index=True)
    pdf_generated_path = models.CharField(max_length=255, blank=True, null=True)
    receipt_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_receipts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Receipt {self.receipt_number} for Invoice {self.invoice.invoice_number}"


class CreditNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    credit_note_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_notes')
    refund_request = models.ForeignKey(
        RefundRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_notes'
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='credit_notes')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255)
    issued_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_credit_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_credit_notes'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self._state.adding:
            assert_period_open(self.created_at or timezone.localdate(), 'credit notes cannot be issued in it')
        else:
            _guard_existing(CreditNote, self.pk, 'created_at', f'credit note {self.credit_note_number} cannot be edited')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"CreditNote {self.credit_note_number} - ₹{self.amount} for {self.invoice.invoice_number}"


class DepartmentChargeEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    source_department = models.CharField(
        max_length=50,
        choices=InvoiceCategory.choices,
        default=InvoiceCategory.OPD,
        db_index=True
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='department_charge_events')
    encounter_type = models.CharField(max_length=50, default='OPD')
    encounter_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    tariff_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    service_name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    override_allowed = models.BooleanField(default=False)
    status = models.CharField(
        max_length=30,
        choices=DepartmentChargeEventStatus.choices,
        default=DepartmentChargeEventStatus.QUEUED,
        db_index=True
    )
    charge_item = models.ForeignKey(
        BillableChargeItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='charge_events'
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_department_charge_events'
        ordering = ['-created_at']

    def __str__(self):
        return f"ChargeEvent [{self.source_department}] {self.service_name} (₹{self.total_amount}) - {self.status}"


class DepartmentGatingRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.CharField(max_length=50, db_index=True)
    gating_action = models.CharField(
        max_length=60,
        choices=GatingAction.choices,
        unique=True,
        db_index=True
    )
    is_hard_gate = models.BooleanField(default=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_department_gating_rules'
        ordering = ['department', 'gating_action']

    def __str__(self):
        gate_type = "HARD GATE" if self.is_hard_gate else "SOFT GATE"
        return f"{self.department} - {self.gating_action} [{gate_type}]"


class ApprovalRequestType(models.TextChoices):
    DISCOUNT = 'DISCOUNT', 'Discount Approval'
    REFUND = 'REFUND', 'Refund Approval'
    INVOICE_VOID = 'INVOICE_VOID', 'Invoice Void'
    CREDIT_LIMIT_OVERRIDE = 'CREDIT_LIMIT_OVERRIDE', 'Credit Limit Override'


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    ESCALATED = 'ESCALATED', 'Escalated to Billing Admin'


class EscalationReason(models.TextChoices):
    SELF_RAISED = 'SELF_RAISED', 'Raised by a supervisor (self-approval block)'
    ABOVE_LIMIT = 'ABOVE_LIMIT', 'Above supervisor limit'
    SLA_BREACH = 'SLA_BREACH', 'Unreviewed past SLA'
    MANUAL = 'MANUAL', 'Escalated by supervisor'


class SupervisorApprovalRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=50, unique=True, db_index=True)
    request_type = models.CharField(max_length=30, choices=ApprovalRequestType.choices, default=ApprovalRequestType.DISCOUNT)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True, related_name='approval_requests')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True, related_name='approval_requests')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    bill_gross = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    reason = models.CharField(max_length=150)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=30, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_approvals')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_approvals')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    # Phase 5: supervisor governance
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='approval_requests')
    shift = models.ForeignKey(CounterShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='approval_requests')
    requested_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    review_notes = models.TextField(blank=True, default='')
    sla_expires_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.CharField(max_length=20, choices=EscalationReason.choices, blank=True, default='')
    escalated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='escalated_approvals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_supervisor_approval_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.request_number} ({self.request_type}) - {self.status}"






# --- PHASE 4: COUNTER SHIFT & CASH CONTROL ---

class CashDenominationTally(models.Model):
    """Note-by-note count of the drawer at shift opening (float) and at closing."""
    DENOMINATIONS = (2000, 500, 200, 100, 50, 20, 10)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift = models.ForeignKey(CounterShift, on_delete=models.CASCADE, related_name='tallies')
    tally_type = models.CharField(max_length=20, choices=TallyType.choices)
    count_2000 = models.PositiveIntegerField(default=0)
    count_500 = models.PositiveIntegerField(default=0)
    count_200 = models.PositiveIntegerField(default=0)
    count_100 = models.PositiveIntegerField(default=0)
    count_50 = models.PositiveIntegerField(default=0)
    count_20 = models.PositiveIntegerField(default=0)
    count_10 = models.PositiveIntegerField(default=0)
    coins_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cash_tallies')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_cash_denomination_tallies'
        ordering = ['recorded_at']
        constraints = [models.UniqueConstraint(fields=['shift', 'tally_type'], name='uniq_tally_per_shift_type')]

    def __str__(self):
        return f"{self.get_tally_type_display()} · {self.total_amount}"


class CashPickupVoucher(models.Model):
    """Mid-shift safe drop: cash removed from a drawer by a supervisor (requested by the cashier or swept)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher_number = models.CharField(max_length=30, unique=True, db_index=True)
    shift = models.ForeignKey(CounterShift, on_delete=models.CASCADE, related_name='pickups')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    reason = models.CharField(max_length=30, choices=PickupReason.choices, default=PickupReason.THRESHOLD_LIMIT_EXCEEDED)
    status = models.CharField(max_length=20, choices=PickupStatus.choices, default=PickupStatus.REQUESTED)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_pickups')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executed_pickups')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    collected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'billing_cash_pickup_vouchers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.voucher_number} · {self.amount} ({self.status})"


class VaultHandover(models.Model):
    """Supervisor hands signed-off cash bags to the central treasury/vault ledger."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handover_number = models.CharField(max_length=30, unique=True, db_index=True)
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vault_handovers')
    total_cash = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_vault_handovers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.handover_number} · {self.total_cash}"


# --- PHASE 5: BILLING SUPERVISOR GOVERNANCE ---

class AuditSeverity(models.TextChoices):
    HIGH = 'HIGH', 'High'
    MEDIUM = 'MEDIUM', 'Medium'
    LOW = 'LOW', 'Low'


class AuditEventType(models.TextChoices):
    HIGH_VALUE_CASH = 'HIGH_VALUE_CASH', 'High-value cash receipt'
    DISCOUNT_REQUESTED = 'DISCOUNT_REQUESTED', 'Discount requested'
    VOID_REQUESTED = 'VOID_REQUESTED', 'Void requested'
    APPROVAL_DECIDED = 'APPROVAL_DECIDED', 'Approval decided'
    APPROVAL_ESCALATED = 'APPROVAL_ESCALATED', 'Approval escalated'
    INVOICE_VOIDED = 'INVOICE_VOIDED', 'Invoice voided'
    REFUND_REQUESTED = 'REFUND_REQUESTED', 'Refund requested'
    REFUND_DECIDED = 'REFUND_DECIDED', 'Refund decided'
    REFUND_PAID = 'REFUND_PAID', 'Refund paid'
    COUNTER_MODE = 'COUNTER_MODE', 'Counter mode'
    CASH_PICKUP = 'CASH_PICKUP', 'Cash pickup'
    CLOSING = 'CLOSING', 'Counter closing'
    VAULT_HANDOVER = 'VAULT_HANDOVER', 'Vault handover'
    TARIFF_CHANGE = 'TARIFF_CHANGE', 'Tariff change'
    PACKAGE_CHANGE = 'PACKAGE_CHANGE', 'Package change'
    ROSTER_PUBLISHED = 'ROSTER_PUBLISHED', 'Roster published'
    POLICY_CHANGE = 'POLICY_CHANGE', 'Policy change'
    MATRIX_CHANGE = 'MATRIX_CHANGE', 'Matrix change'
    HARDWARE_LOCK = 'HARDWARE_LOCK', 'Hardware lock'
    GOP_APPROVED = 'GOP_APPROVED', 'GOP approved'
    CLAIM_DENIED = 'CLAIM_DENIED', 'Claim denied'
    VOUCHER_VERIFIED = 'VOUCHER_VERIFIED', 'Voucher verified'
    CREDIT_CAP_BLOCKED = 'CREDIT_CAP_BLOCKED', 'Credit cap blocked'
    DAILY_TARIFF_ACCRUED = 'DAILY_TARIFF_ACCRUED', 'Daily tariff accrued'
    INTERIM_DEMAND_ISSUED = 'INTERIM_DEMAND_ISSUED', 'Interim demand issued'
    DISCHARGE_CLEARED = 'DISCHARGE_CLEARED', 'Discharge cleared'
    DISCHARGE_GATE_VERIFIED = 'DISCHARGE_GATE_VERIFIED', 'Discharge gate pass verified'
    REVENUE_LEAKAGE = 'REVENUE_LEAKAGE', 'Revenue leakage flagged'
    LEAKAGE_RECOVERED = 'LEAKAGE_RECOVERED', 'Leakage converted to charge'
    LEAKAGE_DISMISSED = 'LEAKAGE_DISMISSED', 'Leakage dismissed'
    FRAUD_SIGNAL = 'FRAUD_SIGNAL', 'Fraud risk signal detected'
    INVESTIGATION_EVENT = 'INVESTIGATION_EVENT', 'Investigation docket event'
    PERIOD_CLOSED = 'PERIOD_CLOSED', 'Period closed'
    PERIOD_REOPEN = 'PERIOD_REOPEN', 'Period reopen'
    PERIOD_LOCK_DENIED = 'PERIOD_LOCK_DENIED', 'Entry refused in locked period'
    REPORT_EXPORTED = 'REPORT_EXPORTED', 'Report exported'
    ERP_JOURNAL = 'ERP_JOURNAL', 'ERP journal posted'


class BillingAuditEvent(models.Model):
    """Flagged financial event shown on the supervisor Audit Stream until a supervisor marks it reviewed."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=30, choices=AuditEventType.choices, db_index=True)
    severity = models.CharField(max_length=10, choices=AuditSeverity.choices, default=AuditSeverity.LOW, db_index=True)
    title = models.CharField(max_length=150)
    detail = models.CharField(max_length=500, blank=True, default='')
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    shift = models.ForeignKey(CounterShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='billing_audit_events')
    reference = models.CharField(max_length=60, blank=True, default='', db_index=True)
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_billing_events')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # Phase 11: append-only hash chain (each entry seals the previous one) so any edit or deletion is detectable
    sequence = models.PositiveBigIntegerField(null=True, blank=True, unique=True, db_index=True)
    prev_hash = models.CharField(max_length=64, blank=True, default='')
    entry_hash = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'billing_audit_events'
        ordering = ['-occurred_at']

    REVIEW_FIELDS = {'reviewed_by', 'reviewed_at'}

    def chain_payload(self) -> str:
        return '|'.join(str(x) for x in (
            self.prev_hash, self.sequence, self.occurred_at.isoformat() if self.occurred_at else '', self.event_type,
            self.severity, self.title, self.detail, self.counter_id or '', self.shift_id or '', self.actor_id or '', self.reference
        ))

    def compute_hash(self) -> str:
        return hashlib.sha256(self.chain_payload().encode('utf-8')).hexdigest()

    def save(self, *args, **kwargs):
        if not self._state.adding:
            # Only the supervisor review stamp may change after an entry is written
            if set(kwargs.get('update_fields') or []) - self.REVIEW_FIELDS or not kwargs.get('update_fields'):
                raise ValueError('Audit entries are immutable; only the review stamp can be added.')
            super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)
        last = BillingAuditEvent.objects.exclude(pk=self.pk).exclude(sequence__isnull=True).order_by('-sequence').values('sequence', 'entry_hash').first()
        self.sequence = (last['sequence'] + 1) if last else 1
        self.prev_hash = last['entry_hash'] if last else ''
        self.entry_hash = self.compute_hash()
        BillingAuditEvent.objects.filter(pk=self.pk).update(sequence=self.sequence, prev_hash=self.prev_hash, entry_hash=self.entry_hash)

    def delete(self, *args, **kwargs):
        raise ValueError('Audit entries cannot be deleted.')

    def __str__(self):
        return f"[{self.severity}] {self.title} · {self.reference}"


# --- PHASE 6: TARIFFS, PACKAGES & PRICING GOVERNANCE ---

class TariffChangeStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending review'
    APPROVED = 'APPROVED', 'Approved · scheduled'
    PUBLISHED = 'PUBLISHED', 'Published'
    REJECTED = 'REJECTED', 'Returned'
    REVISION = 'REVISION', 'Revision requested'


class TariffChangeRequest(models.Model):
    """A department's proposed price (or a new service). Invisible at counters until approved and effective."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=30, unique=True, db_index=True)
    tariff = models.ForeignKey(TariffMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='change_requests')
    service_code = models.CharField(max_length=50, db_index=True)
    service_name = models.CharField(max_length=200)
    department = models.CharField(max_length=50, default='GENERAL')
    owner_department = models.CharField(max_length=50, blank=True, default='')
    current_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    proposed_price = models.DecimalField(max_digits=12, decimal_places=2)
    proposed_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    proposed_emergency_markup = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    effective_from = models.DateField()
    justification = models.TextField()
    impact_note = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=TariffChangeStatus.choices, default=TariffChangeStatus.PENDING, db_index=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tariff_change_requests')
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_tariff_changes')
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(blank=True, default='')
    cfo_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_tariff_change_requests'
        ordering = ['-created_at']

    @property
    def change_percent(self):
        if not self.current_price:
            return None
        return ((self.proposed_price - self.current_price) / self.current_price * Decimal('100')).quantize(Decimal('0.1'))

    def __str__(self):
        return f"{self.request_number} {self.service_code} {self.current_price} -> {self.proposed_price} ({self.status})"


class TariffRevisionSource(models.TextChoices):
    CHANGE_REQUEST = 'CHANGE_REQUEST', 'Department change request'
    DIRECT_EDIT = 'DIRECT_EDIT', 'Billing admin edit'
    BATCH_IMPORT = 'BATCH_IMPORT', 'Batch import'
    NEW_SERVICE = 'NEW_SERVICE', 'New service'


class TariffRevisionLog(models.Model):
    """Immutable price ledger: one row per price version, live from `effective_from`. Rows are never edited
    (only `applied_at` is stamped once, when a scheduled version goes live) and never deleted."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tariff = models.ForeignKey(TariffMaster, on_delete=models.PROTECT, related_name='revisions')
    change_request = models.ForeignKey(TariffChangeRequest, on_delete=models.PROTECT, null=True, blank=True, related_name='revisions')
    source = models.CharField(max_length=20, choices=TariffRevisionSource.choices)
    old_base_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    new_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    old_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    new_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    old_emergency_markup = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    new_emergency_markup = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    effective_from = models.DateField(db_index=True)
    applied_at = models.DateTimeField(null=True, blank=True, db_index=True)
    revised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tariff_revisions')
    justification = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_tariff_revision_logs'
        ordering = ['-effective_from', '-created_at']

    def save(self, *args, **kwargs):
        if not self._state.adding:
            fields = set(kwargs.get('update_fields') or [])
            original = type(self).objects.filter(pk=self.pk).values_list('applied_at', flat=True).first()
            if fields != {'applied_at'} or original is not None:
                raise ValueError('Tariff revision logs are immutable.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('Tariff revision logs are immutable.')

    def __str__(self):
        return f"{self.tariff.code} {self.old_base_price} -> {self.new_base_price} from {self.effective_from}"


class InclusionType(models.TextChoices):
    INCLUDED = 'INCLUDED', 'Included'
    EXCLUDED = 'EXCLUDED', 'Excluded · billed separately'


class PackageInclusionItem(models.Model):
    """Structured package line: an included service (absorbed up to `max_quantity_covered`) or an exclusion."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE, related_name='items')
    inclusion_type = models.CharField(max_length=10, choices=InclusionType.choices, default=InclusionType.INCLUDED)
    service_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    service_name = models.CharField(max_length=200)
    department = models.CharField(max_length=50, blank=True, default='')
    max_quantity_covered = models.PositiveIntegerField(default=1)
    is_mandatory = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'billing_package_inclusion_items'
        ordering = ['inclusion_type', 'sort_order']

    def __str__(self):
        return f"{self.package.code} · {self.inclusion_type} · {self.service_code or self.service_name}"


class EmergencyMarkupSchedule(models.Model):
    """Time-based emergency surcharge (night hours, weekends). Overrides the tariff's flat emergency markup."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=100, default='Night surcharge')
    department = models.CharField(max_length=50, default='ALL', db_index=True)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    applies_from_time = models.TimeField()
    applies_to_time = models.TimeField()
    is_weekend_active = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='markup_schedules')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_emergency_markup_schedules'
        ordering = ['department', 'applies_from_time']

    def applies_at(self, at) -> bool:
        """`at` is a local datetime. Windows may wrap midnight (22:00-06:00); weekends apply all day if enabled."""
        if self.is_weekend_active and at.weekday() >= 5:
            return True
        t, start, end = at.time(), self.applies_from_time, self.applies_to_time
        if start == end:
            return True
        return start <= t < end if start < end else (t >= start or t < end)

    def __str__(self):
        return f"{self.label} {self.department} +{self.markup_percentage}%"


# --- PHASE 7: BILLING ADMIN CORE & GOVERNANCE ---

class TierLevel(models.TextChoices):
    SUPERVISOR = 'SUPERVISOR', 'Supervisor'
    MANAGER = 'MANAGER', 'Manager'
    ADMIN = 'ADMIN', 'Billing Admin'
    CFO = 'CFO', 'CFO'


class MatrixActionType(models.TextChoices):
    DISCOUNT = 'DISCOUNT', 'Discount'
    REFUND = 'REFUND', 'Refund'
    VOID = 'VOID', 'Void'
    WRITE_OFF = 'WRITE_OFF', 'Write-off'
    CREDIT_DISCHARGE = 'CREDIT_DISCHARGE', 'Credit Discharge'
    CORPORATE_OVERRIDE = 'CORPORATE_OVERRIDE', 'Corporate Override'


class ApprovalMatrixTier(models.Model):
    """Threshold configurations per financial exception."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tier_level = models.CharField(max_length=20, choices=TierLevel.choices, db_index=True)
    action_type = models.CharField(max_length=30, choices=MatrixActionType.choices, db_index=True)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sla_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_approval_matrix_tiers'
        ordering = ['action_type', 'tier_level']
        unique_together = ('tier_level', 'action_type')

    def __str__(self):
        return f"[{self.tier_level}] {self.action_type} - {self.max_percentage or '—'}% / ₹{self.max_amount or '—'}"


class PolicyCategory(models.TextChoices):
    DISCOUNT = 'DISCOUNT', 'Discount Governance'
    REFUND = 'REFUND', 'Refund Governance'
    CASH_DRAWER = 'CASH_DRAWER', 'Cash Drawer Limits'
    DISCHARGE = 'DISCHARGE', 'Financial Discharge'
    GENERAL = 'GENERAL', 'General Financial Policy'


class BillingPolicyRule(models.Model):
    """Hospital-wide financial governance rules."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule_code = models.CharField(max_length=50, unique=True, db_index=True)
    rule_name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=PolicyCategory.choices, default=PolicyCategory.GENERAL, db_index=True)
    parameter_value = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True, default='')
    priority = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_policy_rules'
        ordering = ['priority', 'rule_code']

    def __str__(self):
        return f"{self.rule_code} · {self.rule_name} ({'Active' if self.is_active else 'Disabled'})"


class HardwareStatus(models.TextChoices):
    ONLINE = 'ONLINE', 'Online'
    OFFLINE = 'OFFLINE', 'Offline'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'


class CounterHardwareRegistry(models.Model):
    """Physical hardware binding and terminal lockdown for billing counters."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    counter = models.OneToOneField(BillingCounter, on_delete=models.CASCADE, related_name='hardware_registry')
    ip_address = models.CharField(max_length=45, blank=True, default='')
    mac_address = models.CharField(max_length=50, blank=True, default='')
    thermal_printer_name = models.CharField(max_length=100, blank=True, default='')
    pos_terminal_tid = models.CharField(max_length=50, blank=True, default='')
    upi_vpa = models.CharField(max_length=100, blank=True, default='')
    is_terminal_lock_enabled = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=HardwareStatus.choices, default=HardwareStatus.ONLINE)
    last_heartbeat_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_counter_hardware_registry'
        ordering = ['counter__code']

    def __str__(self):
        return f"Hardware for {self.counter.code} · IP {self.ip_address or 'Unassigned'} ({self.status})"


class StaffShiftType(models.TextChoices):
    MORNING = 'MORNING', 'Morning (08:00 - 16:00)'
    EVENING = 'EVENING', 'Evening (16:00 - 00:00)'
    NIGHT = 'NIGHT', 'Night (00:00 - 08:00)'


class RosterStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    PUBLISHED = 'PUBLISHED', 'Published'
    COMPLETED = 'COMPLETED', 'Completed'
    ABSENT = 'ABSENT', 'Absent'


class BillingStaffRoster(models.Model):
    """Duty roster assigning cashiers and supervisors to counters and shifts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    counter = models.ForeignKey(BillingCounter, on_delete=models.CASCADE, related_name='roster_assignments')
    staff_member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billing_roster_shifts')
    roster_date = models.DateField(db_index=True)
    shift_type = models.CharField(max_length=20, choices=StaffShiftType.choices, default=StaffShiftType.MORNING)
    status = models.CharField(max_length=20, choices=RosterStatus.choices, default=RosterStatus.SCHEDULED)
    is_published = models.BooleanField(default=False)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_roster_shifts')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_staff_rosters'
        ordering = ['roster_date', 'shift_type', 'counter__code']
        unique_together = ('counter', 'roster_date', 'shift_type')

    def __str__(self):
        return f"{self.roster_date} {self.shift_type} · {self.counter.code} -> {self.staff_member.username}"


# --- PHASE 9: IPD BILLING & DISCHARGE CLEARANCE ---

class IPDRunningLedgerItemType(models.TextChoices):
    BED_TARIFF = 'BED_TARIFF', 'Bed Tariff'
    NURSING_CARE = 'NURSING_CARE', 'Nursing Care'
    RESIDENT_ROUNDS = 'RESIDENT_ROUNDS', 'Resident Doctor Rounds'
    OT_PROCEDURE = 'OT_PROCEDURE', 'OT & Surgical Procedure'
    LAB_TEST = 'LAB_TEST', 'Diagnostic Lab Test'
    PHARMACY_ISSUE = 'PHARMACY_ISSUE', 'Ward Pharmacy Dispense'


class IPDRunningLedger(models.Model):
    """Real-time daily charge ledger for admitted inpatients."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.CASCADE, related_name='running_ledger_entries')
    date = models.DateField(db_index=True)
    item_type = models.CharField(max_length=30, choices=IPDRunningLedgerItemType.choices, db_index=True)
    service_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_interim_billed = models.BooleanField(default=False, db_index=True)
    invoice_item = models.ForeignKey(InvoiceItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='ipd_ledger_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ipd_running_ledgers'
        ordering = ['date', 'created_at']

    def __str__(self):
        return f"{self.admission.admission_number} · {self.item_type} · ₹{self.amount} ({self.date})"


class InterimDemandStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Attendant Top-Up'
    PAID = 'PAID', 'Settled / Deposit Received'
    WAIVED = 'WAIVED', 'Waived / Overridden'


class InterimDepositDemand(models.Model):
    """High-balance alert notices issued to inpatient attendants when running ledger exceeds deposit buffer."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.CASCADE, related_name='interim_demands')
    demand_number = models.CharField(max_length=30, unique=True, db_index=True)
    running_total = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_balance = models.DecimalField(max_digits=12, decimal_places=2)
    demanded_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=InterimDemandStatus.choices, default=InterimDemandStatus.PENDING, db_index=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_interim_demands')
    notes = models.TextField(blank=True, default='')
    notified_attendant = models.BooleanField(default=True)

    class Meta:
        db_table = 'interim_deposit_demands'
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.demand_number} · {self.admission.admission_number} · Demanded ₹{self.demanded_amount} ({self.status})"


# --- PHASE 10: REVENUE INTEGRITY & GOVERNANCE ---

class RevenueLeakageType(models.TextChoices):
    UNBILLED_ORDER_24H = 'UNBILLED_ORDER_24H', 'Unbilled Order > 24h'
    DISCHARGED_NOT_BILLED = 'DISCHARGED_NOT_BILLED', 'Discharged Not Billed > 2h'
    MISSED_BED_DAY = 'MISSED_BED_DAY', 'Missed Bed Day Tariff'
    ORPHAN_DISPENSE = 'ORPHAN_DISPENSE', 'Orphan Pharmacy Dispense'
    UNRECONCILED_VOID = 'UNRECONCILED_VOID', 'Unreconciled Void / Cancellation'
    EXCESSIVE_DISCOUNT = 'EXCESSIVE_DISCOUNT', 'Excessive / Clustered Discount'
    EXCESSIVE_REFUND = 'EXCESSIVE_REFUND', 'Excessive Refund Pattern'


class RevenueLeakageStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open / Flagged'
    INVESTIGATING = 'INVESTIGATING', 'Under Investigation'
    CONVERTED_TO_CHARGE = 'CONVERTED_TO_CHARGE', 'Converted to Charge'
    FALSE_POSITIVE = 'FALSE_POSITIVE', 'Dismissed / False Positive'


class RevenueLeakageAlert(models.Model):
    """Flagged unbilled clinical events or orphaned charges detected across departments."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    leakage_type = models.CharField(max_length=30, choices=RevenueLeakageType.choices, db_index=True)
    department = models.CharField(max_length=50, default='GENERAL', db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='leakage_alerts')
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='leakage_alerts')
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    risk_score = models.IntegerField(default=50)  # 1 - 100
    status = models.CharField(max_length=30, choices=RevenueLeakageStatus.choices, default=RevenueLeakageStatus.OPEN, db_index=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leakages')
    source_event_reference = models.CharField(max_length=100, blank=True, default='', db_index=True)
    dismissal_reason = models.TextField(blank=True, default='')
    converted_charge = models.ForeignKey(BillableChargeItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='originating_leakage')
    notes = models.TextField(blank=True, default='')
    detected_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'revenue_leakage_alerts'
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.leakage_type} · {self.department} · ₹{self.estimated_amount} (Score: {self.risk_score})"


class FraudRiskSignalSeverity(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class FraudRiskSignal(models.Model):
    """Abnormal behavioral patterns detected across billing counters and cashiers."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    signal_code = models.CharField(max_length=50, db_index=True)
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='fraud_risk_signals')
    counter = models.ForeignKey(BillingCounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='fraud_risk_signals')
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=FraudRiskSignalSeverity.choices, default=FraudRiskSignalSeverity.MEDIUM, db_index=True)
    occurrences_count = models.IntegerField(default=1)
    risk_score = models.IntegerField(default=50)
    detected_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_risk_signals')

    class Meta:
        db_table = 'fraud_risk_signals'
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.signal_code} · {self.severity} · {self.description[:40]}"


class RevenueInvestigationStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open Investigation'
    EVIDENCE_COLLECTED = 'EVIDENCE_COLLECTED', 'Evidence Collected'
    RESOLVED = 'RESOLVED', 'Resolved & Findings Filed'
    CLOSED = 'CLOSED', 'Closed'


class RevenueInvestigationCase(models.Model):
    """Formal investigation docket for compliance and revenue integrity officers."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=30, unique=True, db_index=True)
    subject = models.CharField(max_length=255)
    leakage_alert = models.ForeignKey(RevenueLeakageAlert, on_delete=models.SET_NULL, null=True, blank=True, related_name='investigation_cases')
    risk_signal = models.ForeignKey(FraudRiskSignal, on_delete=models.SET_NULL, null=True, blank=True, related_name='investigation_cases')
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='investigation_cases')
    status = models.CharField(max_length=30, choices=RevenueInvestigationStatus.choices, default=RevenueInvestigationStatus.OPEN, db_index=True)
    findings = models.TextField(blank=True, default='')
    recovered_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'revenue_investigation_cases'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.case_number} · {self.subject} ({self.status})"


# --- PHASE 11: REPORTS, PERIOD CLOSE & AUDIT ---

class PeriodType(models.TextChoices):
    DAILY = 'DAILY', 'Day'
    MONTHLY = 'MONTHLY', 'Month'
    ANNUAL = 'ANNUAL', 'Financial year'


class PeriodStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    PRE_CLOSE_AUDIT = 'PRE_CLOSE_AUDIT', 'Pre-close audit'
    LOCKED = 'LOCKED', 'Locked'
    REOPENED = 'REOPENED', 'Reopened (time-boxed)'


class FinancialPeriodLock(models.Model):
    """A closed day, month or financial year. LOCKED periods reject new or edited transactions dated inside them;
    a CFO-approved reopen is time-boxed and relocks itself when it expires."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    period_name = models.CharField(max_length=40)
    period_type = models.CharField(max_length=10, choices=PeriodType.choices)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=PeriodStatus.choices, default=PeriodStatus.OPEN, db_index=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_periods')
    closed_at = models.DateTimeField(null=True, blank=True)
    total_gross_billed = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_discounts = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_tax = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_collected = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_refunded = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_outstanding = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    checklist = models.JSONField(default=list, blank=True)
    carry_forward_note = models.TextField(blank=True, default='')
    journal = models.JSONField(default=list, blank=True)
    journal_reference = models.CharField(max_length=30, blank=True, default='', db_index=True)
    reopen_reason = models.TextField(blank=True, default='')
    reopen_requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='period_reopen_requests')
    reopen_requested_at = models.DateTimeField(null=True, blank=True)
    reopen_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='period_reopen_approvals')
    reopen_approved_at = models.DateTimeField(null=True, blank=True)
    reopen_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_financial_period_locks'
        ordering = ['-start_date', 'period_type']
        constraints = [models.UniqueConstraint(fields=['period_type', 'start_date'], name='uniq_period_lock')]

    @classmethod
    def locking(cls, on_date):
        """The lock that currently forbids entries dated `on_date`, if any. Expired reopens relock here."""
        if on_date is None:
            return None
        now = timezone.now()
        cls.objects.filter(status=PeriodStatus.REOPENED, reopen_expires_at__lte=now).update(status=PeriodStatus.LOCKED)
        return cls.objects.filter(status=PeriodStatus.LOCKED, start_date__lte=on_date, end_date__gte=on_date) \
            .order_by('start_date').first()

    def __str__(self):
        return f"{self.period_name} ({self.status})"


class DailyRevenueSnapshot(models.Model):
    """Pre-aggregated day totals. Department rows carry tender_mode='ALL'; tender rows carry department='ALL'.
    Rows for locked days are final and are read instead of re-aggregating transactions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    snapshot_date = models.DateField(db_index=True)
    department = models.CharField(max_length=50, default='ALL')
    tender_mode = models.CharField(max_length=30, default='ALL')
    gross_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    discounts = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    net_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    taxes_collected = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    refunds = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    collected = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    invoice_count = models.PositiveIntegerField(default=0)
    transaction_count = models.PositiveIntegerField(default=0)
    is_final = models.BooleanField(default=False)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_daily_revenue_snapshots'
        ordering = ['-snapshot_date', 'department', 'tender_mode']
        constraints = [models.UniqueConstraint(fields=['snapshot_date', 'department', 'tender_mode'], name='uniq_daily_snapshot')]

    def __str__(self):
        return f"{self.snapshot_date} {self.department}/{self.tender_mode} net {self.net_revenue}"


class GLJournalSource(models.TextChoices):
    CASHIER_SETTLEMENT = 'CASHIER_SETTLEMENT', 'Cashier Settlement'
    PATIENT_DEPOSIT = 'PATIENT_DEPOSIT', 'Patient Deposit'
    REFUND_DISBURSAL = 'REFUND_DISBURSAL', 'Refund Disbursal'
    PERIOD_CLOSE = 'PERIOD_CLOSE', 'Period Close'
    AD_HOC = 'AD_HOC', 'Ad-hoc Posting'


class GeneralLedgerJournalEntry(models.Model):
    """Real-time double-entry General Ledger journal voucher generated upon cashier settlement or finance posting."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal_reference = models.CharField(max_length=50, unique=True, db_index=True)
    entry_date = models.DateField(default=timezone.localdate, db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='gl_journal_entries')
    receipt = models.ForeignKey(BillingReceipt, on_delete=models.SET_NULL, null=True, blank=True, related_name='gl_journal_entries')
    source_type = models.CharField(max_length=40, choices=GLJournalSource.choices, default=GLJournalSource.CASHIER_SETTLEMENT, db_index=True)
    narration = models.TextField(blank=True, default='')
    total_debit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    is_balanced = models.BooleanField(default=True, db_index=True)
    posted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='posted_gl_entries')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'billing_gl_journal_entries'
        ordering = ['-created_at']

    def __str__(self):
        status_str = 'BALANCED' if self.is_balanced else 'UNBALANCED'
        return f"{self.journal_reference} ({self.source_type}) · ₹{self.total_debit} [{status_str}]"


class GeneralLedgerLineItem(models.Model):
    """Line item of a General Ledger journal voucher."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal_entry = models.ForeignKey(GeneralLedgerJournalEntry, on_delete=models.CASCADE, related_name='lines')
    account_code = models.CharField(max_length=20, db_index=True)
    account_name = models.CharField(max_length=150)
    debit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    credit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    department = models.CharField(max_length=50, blank=True, default='GENERAL', db_index=True)
    description = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'billing_gl_line_items'
        ordering = ['account_code', '-debit_amount']

    def __str__(self):
        return f"{self.journal_entry.journal_reference} · {self.account_code} {self.account_name} · Dr {self.debit_amount} / Cr {self.credit_amount}"

