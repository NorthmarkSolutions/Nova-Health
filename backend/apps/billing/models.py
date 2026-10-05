import uuid
from decimal import Decimal
from django.db import models
from apps.patients.models import Patient
from apps.accounts.models import User
from apps.ipd.models import InpatientAdmission

class InvoiceStatus(models.TextChoices):
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
    CLOSED = 'CLOSED', 'Closed & Reconciled'

class DepositStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active / Available'
    PARTIALLY_UTILIZED = 'PARTIALLY_UTILIZED', 'Partially Utilized'
    EXHAUSTED = 'EXHAUSTED', 'Fully Exhausted'
    REFUNDED = 'REFUNDED', 'Refunded'

class RefundStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Supervisor Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    DISBURSED = 'DISBURSED', 'Disbursed / Credit Note Issued'

class DischargeClearanceStatus(models.TextChoices):
    PENDING_SETTLEMENT = 'PENDING_SETTLEMENT', 'Pending Settlement'
    DISPUTED = 'DISPUTED', 'Disputed / Under Audit'
    CLEARED = 'CLEARED', 'Financial Discharge Cleared'

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
    payment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

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
    receipt_printed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_deposits'
        ordering = ['-created_at']

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tariff_masters'
        ordering = ['department', 'name']

    def __str__(self):
        return f"{self.code} - {self.name} (₹{self.base_price})"

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_packages'
        ordering = ['name']

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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'corporate_accounts'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.account_type})"

class FinancialDischargeClearance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admission = models.OneToOneField(InpatientAdmission, on_delete=models.CASCADE, related_name='discharge_clearance')
    final_invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='discharge_clearances')
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
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'financial_discharge_clearances'

    def __str__(self):
        return f"Clearance for {self.admission.admission_number}: {self.clearance_status}"
