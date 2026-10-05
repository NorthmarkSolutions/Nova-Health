import uuid
from django.utils import timezone
from django.db import models
from django.db.models import Q, F, CheckConstraint
from apps.accounts.models import User
from apps.patients.models import Patient
from apps.clinical.models import Prescription
from apps.ipd.models import InpatientAdmission
from apps.billing.models import Invoice

# ==========================================
# CHOICE ENUMS
# ==========================================

class MedicineCategory(models.TextChoices):
    TABLET = 'TABLET', 'Tablet'
    CAPSULE = 'CAPSULE', 'Capsule'
    SYRUP = 'SYRUP', 'Syrup'
    INJECTION = 'INJECTION', 'Injection'
    IV_FLUID = 'IV_FLUID', 'IV Fluid'
    OINTMENT = 'OINTMENT', 'Ointment'
    INHALER = 'INHALER', 'Inhaler'
    DROPS = 'DROPS', 'Drops'
    OTHER = 'OTHER', 'Other'

class PRPriority(models.TextChoices):
    ROUTINE = 'ROUTINE', 'Routine'
    URGENT = 'URGENT', 'Urgent'
    EMERGENCY_STAT = 'EMERGENCY_STAT', 'Emergency / STAT'

class PRStatus(models.TextChoices):
    DRAFT = 'Draft', 'Draft'
    PENDING_APPROVAL = 'Pending approval', 'Pending approval'
    APPROVED = 'Approved', 'Approved'
    PO_ISSUED = 'PO issued', 'PO issued'
    RECEIVING = 'Receiving', 'Receiving'
    CLOSED = 'Closed', 'Closed'
    REJECTED = 'Rejected', 'Rejected'
    # Legacy aliases
    SUBMITTED = 'SUBMITTED', 'Submitted'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    CONVERTED_TO_PO = 'CONVERTED_TO_PO', 'Converted to PO'

class POStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    ISSUED = 'ISSUED', 'Issued to Supplier'
    PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', 'Partially Received'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class BatchStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    DEPLETED = 'Depleted', 'Depleted'
    EXPIRED = 'Expired', 'Expired'
    QUARANTINED = 'Quarantined', 'Quarantined'
    RETURNED = 'Return', 'Return to Supplier'
    WRITE_OFF = 'Write-off', 'Marked Write-off'
    RECALLED = 'Recalled', 'Recalled'

class StockTransactionType(models.TextChoices):
    RECEIVE_PO = 'RECEIVE_PO', 'Receive Purchase Order'
    DISPENSE_OPD = 'DISPENSE_OPD', 'Dispense OPD Prescription'
    ISSUE_IPD = 'ISSUE_IPD', 'Issue Inpatient Ward Request'
    SALE_OTC = 'SALE_OTC', 'Over-The-Counter Sale'
    RETURN_RESTOCK = 'RETURN_RESTOCK', 'Return & Restock'
    RETURN_QUARANTINE = 'RETURN_QUARANTINE', 'Return & Quarantine'
    AUDIT_ADJUSTMENT = 'AUDIT_ADJUSTMENT', 'Audit Count Adjustment'
    EXPIRED_DISPOSAL = 'EXPIRED_DISPOSAL', 'Expired Disposal'
    TRANSFER_OUT = 'TRANSFER_OUT', 'Internal Transfer Out'
    TRANSFER_IN = 'TRANSFER_IN', 'Internal Transfer In'

class GoodsReceiptStatus(models.TextChoices):
    PENDING_QC = 'Pending QC', 'Pending QC'
    POSTED = 'Posted', 'Posted'
    REJECTED = 'Rejected', 'Rejected'

class AdjustmentStatus(models.TextChoices):
    PENDING_APPROVAL = 'Pending approval', 'Pending approval'
    POSTED = 'Posted', 'Posted'
    REJECTED = 'Rejected', 'Rejected'

class TransferStatus(models.TextChoices):
    REQUESTED = 'Requested', 'Requested'
    DISPATCHED = 'Dispatched', 'Dispatched'
    RECEIVED = 'Received', 'Received'
    CANCELLED = 'Cancelled', 'Cancelled'

class EncounterType(models.TextChoices):
    OPD = 'OPD', 'Outpatient'
    IPD = 'IPD', 'Inpatient'
    OTC = 'OTC', 'Over-The-Counter'

class SettlementMode(models.TextChoices):
    PAY_AT_PHARMACY = 'PAY_AT_PHARMACY', 'Pay At Pharmacy'
    PAY_AT_RECEPTION = 'PAY_AT_RECEPTION', 'Pay At Reception'
    INSURANCE = 'INSURANCE', 'Insurance / TPA'
    CORPORATE = 'CORPORATE', 'Corporate / Institutional'
    CREDIT = 'CREDIT', 'Hospital Credit Facility'
    IPD_RUNNING_BILL = 'IPD_RUNNING_BILL', 'IPD Running Bill'

class DispensePaymentStatus(models.TextChoices):
    PAID = 'PAID', 'Paid'
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    INSURANCE_PENDING = 'INSURANCE_PENDING', 'Insurance Claim Pending'
    CORPORATE_PENDING = 'CORPORATE_PENDING', 'Corporate Ledger Pending'
    CREDIT_AUTHORIZED = 'CREDIT_AUTHORIZED', 'Credit Authorized'
    DISCHARGE_SETTLED = 'DISCHARGE_SETTLED', 'Discharge Settled'

class DispenseOrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Verification'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    AWAITING_STOCK = 'AWAITING_STOCK', 'Awaiting Stock'
    VERIFIED = 'VERIFIED', 'Verified'
    DISPENSED = 'DISPENSED', 'Dispensed / Fulfilled'
    PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED', 'Partially Dispensed'
    PURCHASED_OUTSIDE = 'PURCHASED_OUTSIDE', 'Purchased Outside'
    CANCELLED = 'CANCELLED', 'Cancelled'

class PrescriptionOutcome(models.TextChoices):
    FULL_PURCHASE = 'FULL_PURCHASE', 'Full Purchase'
    PARTIAL_PURCHASE = 'PARTIAL_PURCHASE', 'Partial Purchase'
    PURCHASED_OUTSIDE = 'PURCHASED_OUTSIDE', 'Purchased Outside'
    DECIDE_LATER = 'DECIDE_LATER', 'Decide Later'

class PurchasedOutsideReason(models.TextChoices):
    PATIENT_CHOICE = 'PATIENT_CHOICE', 'Patient Choice'
    PRICE_CONCERN = 'PRICE_CONCERN', 'Price Concern'
    OUT_OF_STOCK = 'OUT_OF_STOCK', 'Out Of Stock'
    INSURANCE_RESTRICTION = 'INSURANCE_RESTRICTION', 'Insurance Restriction'

class ReturnType(models.TextChoices):
    PATIENT_OPD = 'PATIENT_OPD', 'Patient OPD Return'
    WARD_IPD = 'WARD_IPD', 'Ward IPD Return'

class ReturnAction(models.TextChoices):
    RESTOCK = 'RESTOCK', 'Restock to Inventory'
    QUARANTINE = 'QUARANTINE', 'Quarantine / Write-Off'


# ==========================================
# 1. PHARMACY MEDICINES (FORMULARY MASTER)
# ==========================================

class PharmacyMedicine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200, db_index=True)
    generic_name = models.CharField(max_length=200, db_index=True, blank=True, null=True)
    category = models.CharField(max_length=50, choices=MedicineCategory.choices, default=MedicineCategory.TABLET, db_index=True)
    therapeutic_class = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    strength = models.CharField(max_length=50, blank=True, null=True)
    unit_of_measure = models.CharField(max_length=20, default='TABLET')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.IntegerField(default=50)
    reorder_quantity = models.IntegerField(default=200)
    requires_prescription = models.BooleanField(default=True)
    is_high_risk = models.BooleanField(default=False)
    is_narcotic = models.BooleanField(default=False, db_index=True)
    schedule = models.CharField(max_length=20, default='H', db_index=True)
    is_cold_chain = models.BooleanField(default=False)
    default_supplier = models.ForeignKey('PharmacySupplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='supplied_medicines')
    known_allergens = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_medicines'
        ordering = ['name']
        constraints = [
            CheckConstraint(check=Q(unit_price__gte=0), name='chk_ph_med_unit_price_gte_0'),
            CheckConstraint(check=Q(cost_price__gte=0), name='chk_ph_med_cost_price_gte_0'),
            CheckConstraint(check=Q(reorder_level__gte=0), name='chk_ph_med_reorder_level_gte_0'),
            CheckConstraint(check=Q(reorder_quantity__gt=0), name='chk_ph_med_reorder_qty_gt_0'),
        ]

    def __str__(self):
        return f"{self.name} ({self.item_code}) - ${self.unit_price}"


# ==========================================
# 2. PHARMACY SUPPLIERS (VENDOR MASTER)
# ==========================================

class PharmacySupplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200, db_index=True)
    category = models.CharField(max_length=150, default='General formulary')
    contact_person = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=50)
    email = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    drug_license_number = models.CharField(max_length=100)
    tax_number = models.CharField(max_length=100, blank=True, null=True)
    payment_terms_days = models.IntegerField(default=30)
    lead_time_days = models.IntegerField(default=3)
    on_time_delivery_rate = models.DecimalField(max_digits=5, decimal_places=2, default=95.00)
    status = models.CharField(max_length=30, default='Active')
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_suppliers'
        ordering = ['name']
        constraints = [
            CheckConstraint(check=Q(payment_terms_days__gte=0), name='chk_ph_supp_pay_terms_gte_0'),
        ]

    def __str__(self):
        return f"{self.name} ({self.supplier_code})"


# ==========================================
# 3. PURCHASE REQUESTS & ITEMS (REQUISITIONS)
# ==========================================

class PharmacyPurchaseRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pr_number = models.CharField(max_length=50, unique=True, db_index=True)
    requested_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='pharmacy_purchase_requests')
    supplier = models.ForeignKey(PharmacySupplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_requests')
    priority = models.CharField(max_length=30, choices=PRPriority.choices, default=PRPriority.ROUTINE)
    status = models.CharField(max_length=30, choices=PRStatus.choices, default=PRStatus.DRAFT, db_index=True)
    purchase_order_number = models.CharField(max_length=50, blank=True, null=True)
    goods_receipt_number = models.CharField(max_length=50, blank=True, null=True)
    workflow_stage = models.IntegerField(default=1)
    history_timestamps = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_purchase_requests')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_purchase_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"PR {self.pr_number} ({self.status}) - Priority: {self.priority}"


class PharmacyPurchaseRequestItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_request = models.ForeignKey(PharmacyPurchaseRequest, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='pr_items')
    requested_quantity = models.IntegerField()
    estimated_unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'pharmacy_purchase_request_items'
        constraints = [
            CheckConstraint(check=Q(requested_quantity__gt=0), name='chk_ph_pr_item_qty_gt_0'),
            CheckConstraint(check=Q(estimated_unit_cost__gte=0), name='chk_ph_pr_item_est_cost_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name}: {self.requested_quantity} units"


# ==========================================
# 4. PURCHASE ORDERS & ITEMS (OFFICIAL POS)
# ==========================================

class PharmacyPurchaseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=50, unique=True, db_index=True)
    purchase_request = models.ForeignKey(PharmacyPurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    supplier = models.ForeignKey(PharmacySupplier, on_delete=models.RESTRICT, related_name='purchase_orders')
    approved_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='dispatched_purchase_orders')
    status = models.CharField(max_length=30, choices=POStatus.choices, default=POStatus.ISSUED, db_index=True)
    total_order_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    expected_delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pharmacy_purchase_orders'
        ordering = ['-issued_at']

    def __str__(self):
        return f"PO {self.po_number} -> {self.supplier.name} (${self.total_order_amount})"


class PharmacyPurchaseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PharmacyPurchaseOrder, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='po_items')
    ordered_quantity = models.IntegerField()
    received_quantity = models.IntegerField(default=0)
    agreed_unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'pharmacy_purchase_order_items'
        constraints = [
            CheckConstraint(check=Q(ordered_quantity__gt=0), name='chk_ph_po_item_ord_qty_gt_0'),
            CheckConstraint(check=Q(received_quantity__gte=0), name='chk_ph_po_item_rec_qty_gte_0'),
            CheckConstraint(check=Q(agreed_unit_price__gte=0), name='chk_ph_po_item_price_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name} (Ordered: {self.ordered_quantity}, Recv: {self.received_quantity})"


# ==========================================
# 5. PHARMACY BATCHES (FEFO INVENTORY)
# ==========================================

class PharmacyBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='batches')
    purchase_order = models.ForeignKey(PharmacyPurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    supplier = models.ForeignKey(PharmacySupplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    batch_number = models.CharField(max_length=100, db_index=True)
    manufacturing_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    initial_quantity = models.IntegerField()
    available_quantity = models.IntegerField()
    reserved_quantity = models.IntegerField(default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    storage_location = models.CharField(max_length=100, default='Central Store - Main Rack')
    grn_reference = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    is_quarantined = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=BatchStatus.choices, default=BatchStatus.ACTIVE, db_index=True)
    received_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='received_batches')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_batches'
        ordering = ['expiry_date', 'created_at']
        indexes = [
            models.Index(fields=['medicine', 'expiry_date', 'available_quantity'], name='idx_ph_batch_fefo'),
        ]
        constraints = [
            CheckConstraint(check=Q(initial_quantity__gt=0), name='chk_ph_batch_init_qty_gt_0'),
            CheckConstraint(check=Q(available_quantity__gte=0), name='chk_ph_batch_avail_qty_gte_0'),
            CheckConstraint(check=Q(reserved_quantity__gte=0), name='chk_ph_batch_res_qty_gte_0'),
            CheckConstraint(check=Q(cost_price__gte=0), name='chk_ph_batch_cost_price_gte_0'),
            CheckConstraint(check=Q(expiry_date__gte=F('manufacturing_date')), name='chk_ph_batch_exp_gte_mfg'),
        ]

    def __str__(self):
        return f"{self.medicine.name} (Batch: {self.batch_number}, Exp: {self.expiry_date}, Avail: {self.available_quantity})"


# ==========================================
# 6. STOCK TRANSACTIONS (IMMUTABLE AUDIT LOG)
# ==========================================

class PharmacyStockTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='stock_transactions')
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT, null=True, blank=True, related_name='stock_transactions')
    transaction_type = models.CharField(max_length=30, choices=StockTransactionType.choices, db_index=True)
    quantity_delta = models.IntegerField()  # Positive for additions, negative for deductions
    balance_after = models.IntegerField()
    reference_type = models.CharField(max_length=50)  # e.g., 'PURCHASE_ORDER', 'DISPENSE_ORDER', 'OTC_SALE', 'RETURN'
    reference_id = models.UUIDField(null=True, blank=True)
    reason_or_notes = models.TextField(blank=True, null=True)
    performed_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='pharmacy_stock_transactions')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'pharmacy_stock_transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"StockTx {self.transaction_type}: {self.medicine.name} ({self.quantity_delta:+d} -> Balance: {self.balance_after})"


# ==========================================
# 7. DISPENSE ORDERS & ITEMS (FULFILLMENT)
# ==========================================

class PharmacyDispenseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispense_orders')
    patient = models.ForeignKey(Patient, on_delete=models.RESTRICT, related_name='pharmacy_dispense_orders')
    encounter_type = models.CharField(max_length=20, choices=EncounterType.choices, default=EncounterType.OPD, db_index=True)
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_dispenses')
    ward_name = models.CharField(max_length=100, blank=True, null=True)
    bed_number = models.CharField(max_length=50, blank=True, null=True)
    nurse_name = models.CharField(max_length=150, blank=True, null=True)
    is_emergency = models.BooleanField(default=False)
    emergency_reason = models.TextField(blank=True, null=True)
    is_cancelled = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True, null=True)
    received_by_nurse = models.CharField(max_length=150, blank=True, null=True)
    received_at = models.DateTimeField(null=True, blank=True)
    settlement_mode = models.CharField(max_length=30, choices=SettlementMode.choices, default=SettlementMode.PAY_AT_PHARMACY, db_index=True)
    payment_status = models.CharField(max_length=30, choices=DispensePaymentStatus.choices, default=DispensePaymentStatus.UNPAID, db_index=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    co_pay_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payer_covered_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    tpa_preauth_code = models.CharField(max_length=100, blank=True, null=True)
    corporate_client_id = models.CharField(max_length=100, blank=True, null=True)
    corporate_employee_id = models.CharField(max_length=100, blank=True, null=True)
    credit_facility_account = models.CharField(max_length=100, blank=True, null=True)
    credit_authorized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='authorized_pharmacy_credits')
    status = models.CharField(max_length=30, choices=DispenseOrderStatus.choices, default=DispenseOrderStatus.PENDING, db_index=True)
    billing_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_dispenses')
    dispensed_by = models.ForeignKey(User, on_delete=models.RESTRICT, null=True, blank=True, related_name='dispensed_orders')
    dispensed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, default='ROUTINE', db_index=True)  # 'ROUTINE', 'URGENT', 'STAT'
    doctor_name = models.CharField(max_length=150, blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    has_allergy_warning = models.BooleanField(default=False)
    allergy_warning_details = models.JSONField(default=list, blank=True)
    allergy_override_reason = models.TextField(blank=True, null=True)
    allergy_overridden_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='allergy_overridden_dispenses')
    step = models.IntegerField(default=1)
    identity_confirmed = models.BooleanField(default=False)
    interaction_acknowledged = models.BooleanField(default=False)
    controlled_drug_data = models.JSONField(default=dict, blank=True)
    counseling_data = models.JSONField(default=dict, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    handover_policy = models.CharField(max_length=20, default='PRE_PAID')  # 'PRE_PAID' (hold in bin) or 'POST_PAID'
    token_slip_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    insurance_data = models.JSONField(default=dict, blank=True)
    corporate_data = models.JSONField(default=dict, blank=True)
    credit_data = models.JSONField(default=dict, blank=True)
    ipd_data = models.JSONField(default=dict, blank=True)
    receipt_data = models.JSONField(default=dict, blank=True)
    hold_reason = models.TextField(blank=True, null=True)
    prescription_outcome = models.CharField(max_length=30, choices=PrescriptionOutcome.choices, default=PrescriptionOutcome.FULL_PURCHASE, blank=True)
    purchased_outside_reason = models.CharField(max_length=50, choices=PurchasedOutsideReason.choices, blank=True, null=True)
    purchased_outside_notes = models.TextField(blank=True, null=True)
    purchased_outside_at = models.DateTimeField(blank=True, null=True)
    purchased_outside_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='outside_dispenses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_dispense_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispense {self.order_number} ({self.settlement_mode}) - ${self.total_amount} [{self.status}]"


class PharmacyDispenseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispense_order = models.ForeignKey(PharmacyDispenseOrder, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='dispense_items')
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispense_items')
    prescribed_quantity = models.IntegerField()
    dispensed_quantity = models.IntegerField(default=0)
    is_dispensed = models.BooleanField(default=False)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)
    dosage_instruction = models.CharField(max_length=255, blank=True, null=True)
    has_allergy_conflict = models.BooleanField(default=False)
    allergy_conflict_note = models.CharField(max_length=255, blank=True, null=True)
    is_picked = models.BooleanField(default=False)
    substituted_medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.SET_NULL, null=True, blank=True, related_name='substitutions')
    substitution_note = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'pharmacy_dispense_order_items'
        constraints = [
            CheckConstraint(check=Q(prescribed_quantity__gt=0), name='chk_ph_disp_item_rx_qty_gt_0'),
            CheckConstraint(check=Q(dispensed_quantity__gte=0), name='chk_ph_disp_item_dsp_qty_gte_0'),
            CheckConstraint(check=Q(unit_price__gte=0), name='chk_ph_disp_item_price_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name}: {self.dispensed_quantity} units (Batch: {self.batch.batch_number})"


# ==========================================
# 8. OVER-THE-COUNTER (OTC) SALES
# ==========================================

class PharmacyOTCSale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer_name = models.CharField(max_length=150, default='Walk-in Customer')
    customer_phone = models.CharField(max_length=50, blank=True, null=True)
    registered_patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='otc_sales')
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_mode = models.CharField(max_length=50, default='CASH')
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    cashier_settled = models.BooleanField(default=True)
    billing_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='otc_sales')
    sold_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='sold_otc_sales')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_otc_sales'
        ordering = ['-created_at']

    def __str__(self):
        return f"OTC {self.sale_number} - {self.customer_name} (${self.total_amount})"


class PharmacyOTCSaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    otc_sale = models.ForeignKey(PharmacyOTCSale, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT)
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pharmacy_otc_sale_items'
        constraints = [
            CheckConstraint(check=Q(quantity__gt=0), name='chk_ph_otc_item_qty_gt_0'),
            CheckConstraint(check=Q(unit_price__gte=0), name='chk_ph_otc_item_price_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name}: {self.quantity} units (${self.line_total})"


# ==========================================
# 9. PHARMACY RETURNS & CREDIT NOTES
# ==========================================

class PharmacyReturn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_number = models.CharField(max_length=50, unique=True, db_index=True)
    original_dispense_order = models.ForeignKey(PharmacyDispenseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    original_otc_sale = models.ForeignKey('PharmacyOTCSale', on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_returns')
    admission = models.ForeignKey(InpatientAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_returns')
    customer_name = models.CharField(max_length=150, blank=True, null=True)
    ward_name = models.CharField(max_length=100, blank=True, null=True)
    bed_number = models.CharField(max_length=50, blank=True, null=True)
    nurse_name = models.CharField(max_length=150, blank=True, null=True)
    item_type = models.CharField(max_length=50, default='Unused')  # 'Damaged', 'Expired', 'Medication changed', 'Unused', 'Discharged', 'CD'
    return_type = models.CharField(max_length=20, choices=ReturnType.choices, default=ReturnType.PATIENT_OPD)
    status = models.CharField(max_length=30, default='Requested', db_index=True)  # Requested, Received, Credited, Quarantined, Destroyed
    total_refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    credit_note_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_returns')
    reason = models.TextField()
    notes = models.TextField(blank=True, null=True)
    condition_verified = models.BooleanField(default=True)
    inspection_checks = models.JSONField(default=dict, blank=True)
    disposition = models.CharField(max_length=30, blank=True, null=True)  # 'restock', 'quarantine'
    refund_route = models.CharField(max_length=100, blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    non_returnable_note = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_returns')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_returns'
        ordering = ['-created_at']

    def __str__(self):
        return f"Return {self.return_number} (${self.total_refund_amount}) - {self.status}"


class PharmacyReturnItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy_return = models.ForeignKey(PharmacyReturn, on_delete=models.CASCADE, related_name='items')
    dispense_order_item = models.ForeignKey(PharmacyDispenseOrderItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='return_items')
    otc_sale_item = models.ForeignKey('PharmacyOTCSaleItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='return_items')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT)
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT)
    quantity_returned = models.IntegerField()
    refund_unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_refund_total = models.DecimalField(max_digits=10, decimal_places=2)
    action = models.CharField(max_length=20, choices=ReturnAction.choices, default=ReturnAction.RESTOCK)
    action_notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'pharmacy_return_items'
        constraints = [
            CheckConstraint(check=Q(quantity_returned__gt=0), name='chk_ph_ret_item_qty_gt_0'),
            CheckConstraint(check=Q(refund_unit_price__gte=0), name='chk_ph_ret_item_price_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name}: {self.quantity_returned} units ({self.action})"


# ==========================================
# 10. CONTROLLED DRUG REGISTER (STATUTORY LOG)
# ==========================================

class PharmacyControlledDrugRegister(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry_number = models.CharField(max_length=50, unique=True, db_index=True)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='controlled_register_entries')
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT, related_name='controlled_register_entries')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='controlled_drug_entries')
    prescribing_doctor_name = models.CharField(max_length=150)
    doctor_license_number = models.CharField(max_length=100)
    quantity_dispensed = models.IntegerField()
    balance_stock_after = models.IntegerField()
    primary_pharmacist = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='primary_controlled_dispenses')
    witness_staff = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='witnessed_controlled_dispenses')
    witness_role = models.CharField(max_length=50, default='Head Nurse / Pharmacist')
    dispense_order = models.ForeignKey(PharmacyDispenseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='controlled_register_entries')
    rx_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    remarks = models.TextField(blank=True, null=True)
    vault_location = models.CharField(max_length=100, blank=True, null=True, default='Vault Safe A (Dual Key)')
    discrepancy_noted = models.BooleanField(default=False)
    discrepancy_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'pharmacy_controlled_drug_register'
        ordering = ['-created_at']
        constraints = [
            CheckConstraint(check=Q(quantity_dispensed__gt=0), name='chk_ph_ctrl_disp_qty_gt_0'),
            CheckConstraint(check=Q(balance_stock_after__gte=0), name='chk_ph_ctrl_bal_after_gte_0'),
        ]

    def __str__(self):
        return f"Narcotic Log {self.entry_number}: {self.medicine.name} ({self.quantity_dispensed} dispensed, Balance: {self.balance_stock_after})"


class PharmacyVaultReconciliation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reconciliation_number = models.CharField(max_length=50, unique=True, db_index=True)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='vault_reconciliations')
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT, related_name='vault_reconciliations')
    register_balance = models.IntegerField()
    physical_count = models.IntegerField()
    variance = models.IntegerField()  # physical_count - register_balance
    status = models.CharField(max_length=30, default='Reconciled', db_index=True)  # 'Reconciled', 'Discrepancy'
    discrepancy_reason = models.TextField(blank=True, null=True)
    vault_location = models.CharField(max_length=100, default='Vault Safe A (Dual Key)')
    performed_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='performed_reconciliations')
    witness_staff = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='witnessed_reconciliations')
    witness_role = models.CharField(max_length=100, default='Head Nurse / Shift Incharge')
    reconciled_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'pharmacy_vault_reconciliations'
        ordering = ['-reconciled_at']

    def __str__(self):
        return f"Vault Rec {self.reconciliation_number}: {self.medicine.name} ({self.status}, Var: {self.variance})"


# ==========================================
# 11. GOODS RECEIPTS & ITEMS (GRN VERIFICATION)
# ==========================================

class PharmacyGoodsReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grn_number = models.CharField(max_length=50, unique=True, db_index=True)
    supplier = models.ForeignKey(PharmacySupplier, on_delete=models.RESTRICT, related_name='goods_receipts')
    purchase_order = models.ForeignKey(PharmacyPurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='goods_receipts')
    purchase_request = models.ForeignKey(PharmacyPurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='goods_receipts')
    invoice_number = models.CharField(max_length=100, db_index=True)
    is_cold_chain = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=GoodsReceiptStatus.choices, default=GoodsReceiptStatus.PENDING_QC, db_index=True)
    qc_checks = models.JSONField(default=dict, blank=True)
    received_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='received_goods_receipts')
    notes = models.TextField(blank=True, null=True)
    received_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pharmacy_goods_receipts'
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.grn_number} ({self.status}) - {self.supplier.name}"


class PharmacyGoodsReceiptItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goods_receipt = models.ForeignKey(PharmacyGoodsReceipt, on_delete=models.CASCADE, related_name='lines')
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='grn_items')
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    received_quantity = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pharmacy_goods_receipt_items'
        constraints = [
            CheckConstraint(check=Q(received_quantity__gt=0), name='chk_ph_grn_item_qty_gt_0'),
            CheckConstraint(check=Q(unit_cost__gte=0), name='chk_ph_grn_item_cost_gte_0'),
        ]

    def __str__(self):
        return f"{self.medicine.name} (Batch: {self.batch_number}, Qty: {self.received_quantity})"


# ==========================================
# 12. STOCK ADJUSTMENTS (RECONCILIATION & DAMAGE)
# ==========================================

class PharmacyStockAdjustment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    adjustment_number = models.CharField(max_length=50, unique=True, db_index=True)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='stock_adjustments')
    batch = models.ForeignKey(PharmacyBatch, on_delete=models.RESTRICT, related_name='stock_adjustments')
    quantity_delta = models.IntegerField()  # Negative for deductions (damage/loss), positive for surplus
    reason = models.CharField(max_length=100)  # 'Physical count', 'Damage', 'Expired'
    status = models.CharField(max_length=30, choices=AdjustmentStatus.choices, default=AdjustmentStatus.POSTED, db_index=True)
    note = models.TextField(blank=True, null=True)
    adjusted_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='initiated_adjustments')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_stock_adjustments')
    created_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pharmacy_stock_adjustments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.adjustment_number} ({self.status}): {self.medicine.name} {self.quantity_delta:+d} ({self.reason})"


# ==========================================
# 13. TRANSFER REQUESTS (INTERNAL MOVEMENTS)
# ==========================================

class PharmacyTransferRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transfer_number = models.CharField(max_length=50, unique=True, db_index=True)
    medicine = models.ForeignKey(PharmacyMedicine, on_delete=models.RESTRICT, related_name='transfers')
    quantity = models.IntegerField()
    destination = models.CharField(max_length=100)  # 'OPD Counter 1', 'OPD Counter 2', 'IPD store', 'ICU satellite'
    requested_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='requested_transfers')
    status = models.CharField(max_length=30, choices=TransferStatus.choices, default=TransferStatus.REQUESTED, db_index=True)
    dispatched_batch = models.ForeignKey(PharmacyBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispatched_transfers')
    dispatched_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispatched_transfers')
    dispatched_at = models.DateTimeField(null=True, blank=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_transfers')
    received_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_transfer_requests'
        ordering = ['-created_at']
        constraints = [
            CheckConstraint(check=Q(quantity__gt=0), name='chk_ph_tr_qty_gt_0'),
        ]

    def __str__(self):
        return f"{self.transfer_number} ({self.status}): {self.medicine.name} × {self.quantity} -> {self.destination}"


# ==========================================
# 14. PHARMACY COUNTER SHIFT & CASH DRAWER
# ==========================================

class ShiftType(models.TextChoices):
    MORNING = 'MORNING', 'Morning (07:00 - 15:00)'
    EVENING = 'EVENING', 'Evening (15:00 - 23:00)'
    NIGHT = 'NIGHT', 'Night (23:00 - 07:00)'

class PharmacyCounterShift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    counter_name = models.CharField(max_length=50, default='Counter 2 · Main OPD')
    pharmacist = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='pharmacy_shifts')
    shift_date = models.DateField(default=timezone.now)
    shift_type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING)
    opening_float = models.DecimalField(max_digits=10, decimal_places=2, default=2000.00)
    cash_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    card_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    upi_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    refunds_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_closed = models.BooleanField(default=False)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closing_notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'pharmacy_counter_shifts'
        ordering = ['-opened_at']

    def __str__(self):
        return f"{self.counter_name} - {self.shift_type} ({self.shift_date}) [{self.pharmacist.username}]"


# ==========================================
# 15. PHARMACY DUTY SCHEDULING (PHASE 8)
# ==========================================

class PharmacyDutySchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule_code = models.CharField(max_length=50, unique=True, db_index=True)
    day_label = models.CharField(max_length=50, default='Today')
    shift_slot = models.CharField(max_length=100, default='Morning · 07:00–15:00')
    shift_date = models.DateField(default=timezone.now, db_index=True)
    shift_type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING)
    area = models.CharField(max_length=100)
    required_staff_count = models.IntegerField(default=2)
    assigned_staff = models.ManyToManyField(User, blank=True, related_name='pharmacy_duty_assignments')
    status = models.CharField(max_length=30, default='Covered')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_duty_schedules'
        ordering = ['shift_date', 'shift_type']

    def __str__(self):
        return f"{self.schedule_code}: {self.area} ({self.shift_slot}) - {self.status}"


# ==========================================
# 16. GOVERNANCE AUDIT LOGS (PHASE 8)
# ==========================================

class PharmacyGovernanceAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_governance_logs')
    user_name = models.CharField(max_length=150)
    terminal = models.CharField(max_length=50, default='OPD-C2')
    action = models.CharField(max_length=200)
    entity_reference = models.CharField(max_length=200)
    severity = models.CharField(max_length=30, default='Info', db_index=True)
    details = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'pharmacy_governance_audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.severity}] {self.action} by {self.user_name} ({self.entity_reference})"


# ==========================================
# 17. DEPARTMENT SETTINGS (PHASE 8)
# ==========================================

class PharmacyDepartmentSetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    setting_key = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    scope = models.CharField(max_length=100)
    value_type = models.CharField(max_length=20, default='BOOLEAN')
    boolean_val = models.BooleanField(null=True, blank=True)
    string_val = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    last_changed_by = models.CharField(max_length=150, default='Dr. Pooja Shah · Chief Pharmacist')
    last_changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'pharmacy_department_settings'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.scope}) = {self.boolean_val if self.value_type == 'BOOLEAN' else self.string_val}"


