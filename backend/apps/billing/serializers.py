from rest_framework import serializers
from .models import (
    BillingCounter, CounterShift, Invoice, InvoiceItem, Payment,
    PatientDeposit, RefundRequest, TariffMaster, ServicePackage,
    CorporateAccount, FinancialDischargeClearance,
    BillableChargeItem, BillingReceipt, CreditNote,
    DepartmentChargeEvent, DepartmentGatingRule, SupervisorApprovalRequest,
    ApprovalMatrixTier, BillingPolicyRule, CounterHardwareRegistry, BillingStaffRoster,
    TPAClaimRecord, CorporateCreditVoucher,
    IPDRunningLedger, InterimDepositDemand,
    RevenueLeakageAlert, FraudRiskSignal, RevenueInvestigationCase,
    GeneralLedgerJournalEntry, GeneralLedgerLineItem
)

class BillingCounterSerializer(serializers.ModelSerializer):
    stationLocationDisplay = serializers.CharField(source='get_station_location_display', read_only=True)

    class Meta:
        model = BillingCounter
        fields = ['id', 'code', 'name', 'station_location', 'stationLocationDisplay', 'is_active', 'ip_terminal_binding', 'created_at']

class CounterShiftSerializer(serializers.ModelSerializer):
    counterCode = serializers.CharField(source='counter.code', read_only=True)
    counterName = serializers.CharField(source='counter.name', read_only=True)
    cashierName = serializers.SerializerMethodField()
    supervisorName = serializers.SerializerMethodField()

    class Meta:
        model = CounterShift
        fields = [
            'id', 'counter', 'counterCode', 'counterName', 'cashier', 'cashierName',
            'opening_float', 'opening_time', 'closing_time', 'status',
            'denominations_submitted', 'card_settlement_batch_total', 'upi_settlement_total',
            'physical_cash_count', 'system_expected_cash', 'cash_variance', 'variance_note',
            'supervisor_sign_off_by', 'supervisorName', 'supervisor_signed_at', 'created_at'
        ]

    def get_cashierName(self, obj):
        if obj.cashier:
            return obj.cashier.get_full_name() or obj.cashier.username
        return ''

    def get_supervisorName(self, obj):
        if obj.supervisor_sign_off_by:
            return obj.supervisor_sign_off_by.get_full_name() or obj.supervisor_sign_off_by.username
        return ''

class InvoiceItemSerializer(serializers.ModelSerializer):
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=12, decimal_places=2)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'source', 'department', 'service_code', 'description',
            'qty', 'unitPrice', 'discount_percent', 'discount_amount',
            'tax_rate', 'tax_amount', 'total', 'source_reference_id'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    paymentNumber = serializers.CharField(source='payment_number', read_only=True)
    paymentMethod = serializers.CharField(source='payment_method', required=False)
    tenderMode = serializers.CharField(source='tender_mode', required=False)
    transactionReference = serializers.CharField(source='transaction_reference', required=False, allow_null=True)
    paymentDate = serializers.DateTimeField(source='payment_date', read_only=True)
    cashierName = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'patient', 'paymentNumber', 'amount', 'paymentMethod',
            'tenderMode', 'transactionReference', 'card_network', 'card_last_four',
            'auth_code', 'upi_vpa', 'cheque_number', 'cheque_bank', 'payment_status',
            'counter', 'cashier', 'cashierName', 'shift', 'paymentDate'
        ]

    def get_cashierName(self, obj):
        if obj.cashier:
            return obj.cashier.get_full_name() or obj.cashier.username
        return ''

class InvoiceSerializer(serializers.ModelSerializer):
    invNo = serializers.CharField(source='invoice_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    phone = serializers.CharField(source='patient.phone_number', read_only=True)
    advanceDeducted = serializers.DecimalField(source='advance_deducted', max_digits=12, decimal_places=2)
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    cashierName = serializers.SerializerMethodField()
    counterCode = serializers.CharField(source='counter.code', read_only=True)
    assistedByName = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invNo', 'invoice_number', 'patient', 'patientName', 'uhid', 'phone',
            'category', 'encounter_type', 'date', 'subtotal', 'discount', 'tax',
            'advanceDeducted', 'total', 'paid', 'balance', 'status', 'settlement_mode',
            'token_slip_number', 'tpa_claim_reference', 'corporate_reference',
            'counter', 'counterCode', 'cashier', 'cashierName', 'shift',
            'discount_reason', 'discount_approved_by', 'cancellation_reason',
            'assisted_by', 'assistedByName',
            'items', 'payments', 'created_at', 'updated_at'
        ]

    def get_assistedByName(self, obj):
        if obj.assisted_by:
            return obj.assisted_by.get_full_name() or obj.assisted_by.username
        return None

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_cashierName(self, obj):
        if obj.cashier:
            return obj.cashier.get_full_name() or obj.cashier.username
        return ''

class PatientDepositSerializer(serializers.ModelSerializer):
    depositNumber = serializers.CharField(source='deposit_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    cashierName = serializers.SerializerMethodField()

    class Meta:
        model = PatientDeposit
        fields = [
            'id', 'depositNumber', 'patient', 'patientName', 'uhid', 'ipd_admission',
            'deposit_amount', 'utilized_amount', 'available_balance', 'tender_mode',
            'transaction_reference', 'status', 'counter', 'cashier', 'cashierName',
            'receipt_printed', 'notes', 'created_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_cashierName(self, obj):
        if obj.cashier:
            return obj.cashier.get_full_name() or obj.cashier.username
        return ''

class RefundRequestSerializer(serializers.ModelSerializer):
    refundNumber = serializers.CharField(source='refund_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    invoiceNumber = serializers.CharField(source='invoice.invoice_number', read_only=True)
    initiatedByName = serializers.SerializerMethodField()
    approvedByName = serializers.SerializerMethodField()

    class Meta:
        model = RefundRequest
        fields = [
            'id', 'refundNumber', 'invoice', 'invoiceNumber', 'payment', 'patient',
            'patientName', 'uhid', 'requested_amount', 'reason', 'clinical_justification',
            'status', 'initiated_by', 'initiatedByName', 'approved_by', 'approvedByName',
            'approved_at', 'disbursed_at', 'disbursed_tender', 'rejection_reason',
            'credit_note_number', 'original_tender', 'refund_items', 'review_notes', 'escalated_at',
            'created_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_initiatedByName(self, obj):
        if obj.initiated_by:
            return obj.initiated_by.get_full_name() or obj.initiated_by.username
        return ''

    def get_approvedByName(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ''

class TariffMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffMaster
        fields = [
            'id', 'code', 'name', 'department', 'base_price',
            'emergency_markup_percent', 'gst_rate', 'is_active', 'owner_department', 'created_at', 'updated_at'
        ]

class ServicePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePackage
        fields = [
            'id', 'code', 'name', 'package_price', 'department',
            'inclusions_description', 'exclusions_description', 'validity_days',
            'is_active', 'created_at'
        ]

class CorporateAccountSerializer(serializers.ModelSerializer):
    available_credit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    utilization_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = CorporateAccount
        fields = [
            'id', 'code', 'name', 'account_type', 'credit_limit', 'utilized_credit',
            'available_credit', 'utilization_percentage',
            'co_pay_percentage', 'deductible_amount', 'room_rent_ceiling', 'valid_until',
            'settlement_tat_days', 'contract_reference', 'tariff_discount_percent',
            'contact_person', 'contact_email', 'contact_phone', 'billing_cycle',
            'plans_data', 'required_docs', 'signatories', 'covered_services',
            'is_active', 'created_at'
        ]

class FinancialDischargeClearanceSerializer(serializers.ModelSerializer):
    admissionNumber = serializers.CharField(source='admission.admission_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='admission.patient.uhid', read_only=True)
    bedNumber = serializers.SerializerMethodField()
    wardName = serializers.CharField(source='admission.ward_name', read_only=True)
    finalInvoiceNumber = serializers.CharField(source='final_invoice.invoice_number', read_only=True)
    clearedByName = serializers.SerializerMethodField()

    class Meta:
        model = FinancialDischargeClearance
        fields = [
            'id', 'admission', 'admissionNumber', 'patientName', 'uhid', 'bedNumber', 'wardName',
            'final_invoice', 'finalInvoiceNumber', 'clearance_status',
            'net_payable', 'deposit_applied', 'insurance_covered', 'patient_paid',
            'cleared_by', 'clearedByName', 'cleared_at', 'qr_verification_token',
            'override_reason', 'checklist_confirmed', 'notes', 'created_at'
        ]

    def get_patientName(self, obj):
        if obj.admission and obj.admission.patient:
            return f"{obj.admission.patient.first_name} {obj.admission.patient.last_name}".strip()
        return ''

    def get_bedNumber(self, obj):
        if obj.admission and obj.admission.bed:
            return obj.admission.bed.bed_number
        return None

    def get_clearedByName(self, obj):
        if obj.cleared_by:
            return obj.cleared_by.get_full_name() or obj.cleared_by.username
        return ''


class BillableChargeItemSerializer(serializers.ModelSerializer):
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    invoiceNumber = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = BillableChargeItem
        fields = [
            'id', 'patient', 'patientName', 'uhid', 'department',
            'service_code', 'service_name', 'unit_price', 'quantity',
            'discount_amount', 'tax_rate', 'tax_amount', 'total_amount',
            'source_reference_id', 'priority', 'status', 'invoice', 'invoiceNumber',
            'created_at', 'updated_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''


class BillingReceiptSerializer(serializers.ModelSerializer):
    invoiceNumber = serializers.CharField(source='invoice.invoice_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    paymentNumber = serializers.CharField(source='payment.payment_number', read_only=True)
    issuedByName = serializers.SerializerMethodField()

    class Meta:
        model = BillingReceipt
        fields = [
            'id', 'receipt_number', 'invoice', 'invoiceNumber',
            'patient', 'patientName', 'uhid', 'payment', 'paymentNumber',
            'receipt_type', 'token_slip_number', 'issued_by', 'issuedByName',
            'qr_verification_token', 'pdf_generated_path', 'receipt_payload',
            'created_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_issuedByName(self, obj):
        if obj.issued_by:
            return obj.issued_by.get_full_name() or obj.issued_by.username
        return ''


class CreditNoteSerializer(serializers.ModelSerializer):
    invoiceNumber = serializers.CharField(source='invoice.invoice_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    refundNumber = serializers.CharField(source='refund_request.refund_number', read_only=True)
    issuedByName = serializers.SerializerMethodField()

    class Meta:
        model = CreditNote
        fields = [
            'id', 'credit_note_number', 'invoice', 'invoiceNumber',
            'refund_request', 'refundNumber', 'patient', 'patientName',
            'uhid', 'amount', 'reason', 'issued_by', 'issuedByName',
            'created_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_issuedByName(self, obj):
        if obj.issued_by:
            return obj.issued_by.get_full_name() or obj.issued_by.username
        return ''


class PatientLedgerSerializer(serializers.Serializer):
    patient = serializers.DictField()
    invoices = InvoiceSerializer(many=True)
    payments = PaymentSerializer(many=True)
    deposits = PatientDepositSerializer(many=True)
    total_invoiced = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_advance_deposited = serializers.DecimalField(max_digits=14, decimal_places=2)
    available_deposit_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    net_outstanding_balance = serializers.DecimalField(max_digits=14, decimal_places=2)


class DepartmentChargeEventSerializer(serializers.ModelSerializer):
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    chargeItemId = serializers.CharField(source='charge_item.id', read_only=True)

    class Meta:
        model = DepartmentChargeEvent
        fields = [
            'id', 'event_uuid', 'source_department', 'patient', 'patientName', 'uhid',
            'encounter_type', 'encounter_id', 'tariff_code', 'service_name',
            'quantity', 'unit_price', 'total_amount', 'override_allowed',
            'status', 'charge_item', 'chargeItemId', 'metadata',
            'created_at', 'updated_at'
        ]

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''


class DepartmentGatingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentGatingRule
        fields = [
            'id', 'department', 'gating_action', 'is_hard_gate',
            'description', 'created_at', 'updated_at'
        ]


class SupervisorApprovalRequestSerializer(serializers.ModelSerializer):
    requestedByName = serializers.SerializerMethodField()
    approvedByName = serializers.SerializerMethodField()
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    invoiceNumber = serializers.CharField(source='invoice.invoice_number', read_only=True)
    counterCode = serializers.CharField(source='counter.code', read_only=True, default=None)

    class Meta:
        model = SupervisorApprovalRequest
        fields = [
            'id', 'request_number', 'request_type', 'invoice', 'invoiceNumber',
            'patient', 'patientName', 'uhid', 'discount_percent', 'discount_amount',
            'bill_gross', 'reason', 'notes', 'status', 'requested_by', 'requestedByName',
            'approved_by', 'approvedByName', 'approved_at', 'rejection_reason',
            'requested_discount_percent', 'requested_amount', 'review_notes',
            'escalation_reason', 'escalated_at', 'sla_expires_at', 'counterCode',
            'created_at', 'updated_at'
        ]

    def get_requestedByName(self, obj):
        return obj.requested_by.get_full_name() or obj.requested_by.username if obj.requested_by else ''

    def get_approvedByName(self, obj):
        return obj.approved_by.get_full_name() or obj.approved_by.username if obj.approved_by else None

    def get_patientName(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''


class ApprovalMatrixTierSerializer(serializers.ModelSerializer):
    tierLevelDisplay = serializers.CharField(source='get_tier_level_display', read_only=True)
    actionTypeDisplay = serializers.CharField(source='get_action_type_display', read_only=True)

    class Meta:
        model = ApprovalMatrixTier
        fields = [
            'id', 'tier_level', 'tierLevelDisplay', 'action_type', 'actionTypeDisplay',
            'max_percentage', 'max_amount', 'sla_minutes', 'is_active',
            'created_at', 'updated_at'
        ]


class BillingPolicyRuleSerializer(serializers.ModelSerializer):
    categoryDisplay = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = BillingPolicyRule
        fields = [
            'id', 'rule_code', 'rule_name', 'category', 'categoryDisplay',
            'parameter_value', 'description', 'priority', 'is_active',
            'created_at', 'updated_at'
        ]


class CounterHardwareRegistrySerializer(serializers.ModelSerializer):
    counterCode = serializers.CharField(source='counter.code', read_only=True)
    counterName = serializers.CharField(source='counter.name', read_only=True)
    statusDisplay = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CounterHardwareRegistry
        fields = [
            'id', 'counter', 'counterCode', 'counterName', 'ip_address', 'mac_address',
            'thermal_printer_name', 'pos_terminal_tid', 'upi_vpa',
            'is_terminal_lock_enabled', 'status', 'statusDisplay',
            'last_heartbeat_at', 'created_at', 'updated_at'
        ]


class BillingStaffRosterSerializer(serializers.ModelSerializer):
    counterCode = serializers.CharField(source='counter.code', read_only=True)
    counterName = serializers.CharField(source='counter.name', read_only=True)
    counterLocation = serializers.CharField(source='counter.get_station_location_display', read_only=True)
    staffName = serializers.SerializerMethodField()
    staffRole = serializers.CharField(source='staff_member.role', read_only=True)
    shiftTypeDisplay = serializers.CharField(source='get_shift_type_display', read_only=True)
    statusDisplay = serializers.CharField(source='get_status_display', read_only=True)
    assignedByName = serializers.SerializerMethodField()

    class Meta:
        model = BillingStaffRoster
        fields = [
            'id', 'counter', 'counterCode', 'counterName', 'counterLocation',
            'staff_member', 'staffName', 'staffRole', 'roster_date',
            'shift_type', 'shiftTypeDisplay', 'status', 'statusDisplay',
            'is_published', 'assigned_by', 'assignedByName', 'notes',
            'created_at', 'updated_at'
        ]

    def get_staffName(self, obj):
        if obj.staff_member:
            return obj.staff_member.get_full_name() or obj.staff_member.username
        return ''

    def get_assignedByName(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return None


class BillingCounterAdminSerializer(serializers.ModelSerializer):
    stationLocationDisplay = serializers.CharField(source='get_station_location_display', read_only=True)
    hardware = CounterHardwareRegistrySerializer(source='hardware_registry', read_only=True)
    currentShift = serializers.SerializerMethodField()

    class Meta:
        model = BillingCounter
        fields = [
            'id', 'code', 'name', 'station_location', 'stationLocationDisplay',
            'is_active', 'ip_terminal_binding', 'hardware', 'currentShift', 'created_at'
        ]

    def get_currentShift(self, obj):
        shift = obj.shifts.filter(status='OPEN').first()
        if not shift:
            return None
        return {
            'id': str(shift.id),
            'cashier_id': shift.cashier_id,
            'cashier_name': shift.cashier.get_full_name() or shift.cashier.username if shift.cashier else '',
            'opening_time': shift.opening_time.isoformat() if shift.opening_time else None,
            'opening_float': float(shift.opening_float)
        }


class TPAClaimRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='patient.uhid', read_only=True)
    corporate_account_name = serializers.CharField(source='corporate_account.name', read_only=True)
    corporate_account_code = serializers.CharField(source='corporate_account.code', read_only=True)
    admission_number = serializers.CharField(source='admission.admission_number', read_only=True)
    pre_auth_status_display = serializers.CharField(source='get_pre_auth_status_display', read_only=True)
    claim_status_display = serializers.CharField(source='get_claim_status_display', read_only=True)

    class Meta:
        model = TPAClaimRecord
        fields = [
            'id', 'claim_number', 'patient', 'patient_name', 'patient_uhid',
            'admission', 'admission_number', 'corporate_account',
            'corporate_account_name', 'corporate_account_code',
            'policy_number', 'tpa_member_id', 'requested_amount',
            'pre_auth_amount', 'enhancement_amount', 'pre_auth_status',
            'pre_auth_status_display', 'gop_letter_number',
            'non_medical_deductibles', 'copay_percent', 'room_rent_cap',
            'claim_status', 'claim_status_display', 'settled_amount',
            'deduction_amount', 'denial_reason', 'source', 'plan_name',
            'dossier_data', 'tracking_notes', 'created_at', 'updated_at'
        ]

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''


class CorporateCreditVoucherSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='patient.uhid', read_only=True)
    corporate_account_name = serializers.CharField(source='corporate_account.name', read_only=True)
    corporate_account_code = serializers.CharField(source='corporate_account.code', read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    remaining_headroom = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CorporateCreditVoucher
        fields = [
            'id', 'voucher_number', 'corporate_account',
            'corporate_account_name', 'corporate_account_code',
            'employee_id', 'employee_name', 'patient', 'patient_name',
            'patient_uhid', 'relationship', 'approved_credit_ceiling',
            'utilized_amount', 'remaining_headroom', 'validity_date',
            'is_verified', 'verified_by', 'verified_by_name',
            'notes', 'created_at', 'updated_at'
        ]

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.get_full_name() or obj.verified_by.username
        return ''


# --- PHASE 9: IPD BILLING SERIALIZERS ---

class IPDRunningLedgerSerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source='admission.admission_number', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='admission.patient.uhid', read_only=True)
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)

    class Meta:
        model = IPDRunningLedger
        fields = [
            'id', 'admission', 'admission_number', 'patient_name', 'patient_uhid',
            'date', 'item_type', 'item_type_display', 'service_code', 'description',
            'quantity', 'unit_price', 'amount', 'is_interim_billed',
            'invoice_item', 'created_at'
        ]

    def get_patient_name(self, obj):
        if obj.admission and obj.admission.patient:
            return f"{obj.admission.patient.first_name} {obj.admission.patient.last_name}".strip()
        return ''


class InterimDepositDemandSerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source='admission.admission_number', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='admission.patient.uhid', read_only=True)
    ward_name = serializers.CharField(source='admission.ward_name', read_only=True)
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InterimDepositDemand
        fields = [
            'id', 'admission', 'admission_number', 'patient_name', 'patient_uhid',
            'ward_name', 'demand_number', 'running_total', 'deposit_balance',
            'demanded_amount', 'status', 'issued_at', 'issued_by',
            'issued_by_name', 'notes', 'notified_attendant'
        ]

    def get_patient_name(self, obj):
        if obj.admission and obj.admission.patient:
            return f"{obj.admission.patient.first_name} {obj.admission.patient.last_name}".strip()
        return ''

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return obj.issued_by.get_full_name() or obj.issued_by.username
        return ''


# --- PHASE 10: REVENUE INTEGRITY SERIALIZERS ---

class RevenueLeakageAlertSerializer(serializers.ModelSerializer):
    leakage_type_display = serializers.CharField(source='get_leakage_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.CharField(source='patient.uhid', read_only=True)
    admission_number = serializers.CharField(source='admission.admission_number', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = RevenueLeakageAlert
        fields = [
            'id', 'leakage_type', 'leakage_type_display', 'department',
            'patient', 'patient_name', 'patient_uhid',
            'admission', 'admission_number',
            'estimated_amount', 'risk_score', 'status', 'status_display',
            'assigned_to', 'assigned_to_name', 'source_event_reference',
            'dismissal_reason', 'converted_charge', 'notes',
            'detected_at', 'updated_at'
        ]

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return ''


class FraudRiskSignalSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    target_user_name = serializers.SerializerMethodField()
    counter_code = serializers.CharField(source='counter.code', read_only=True)
    counter_name = serializers.CharField(source='counter.name', read_only=True)
    acknowledged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FraudRiskSignal
        fields = [
            'id', 'signal_code', 'target_user', 'target_user_name',
            'counter', 'counter_code', 'counter_name', 'description',
            'severity', 'severity_display', 'occurrences_count',
            'risk_score', 'detected_at', 'is_acknowledged',
            'acknowledged_by', 'acknowledged_by_name'
        ]

    def get_target_user_name(self, obj):
        if obj.target_user:
            return obj.target_user.get_full_name() or obj.target_user.username
        return ''

    def get_acknowledged_by_name(self, obj):
        if obj.acknowledged_by:
            return obj.acknowledged_by.get_full_name() or obj.acknowledged_by.username
        return ''


class RevenueInvestigationCaseSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    owner_name = serializers.SerializerMethodField()
    leakage_alert_details = serializers.SerializerMethodField()
    risk_signal_details = serializers.SerializerMethodField()

    class Meta:
        model = RevenueInvestigationCase
        fields = [
            'id', 'case_number', 'subject', 'leakage_alert', 'leakage_alert_details',
            'risk_signal', 'risk_signal_details', 'owner', 'owner_name',
            'status', 'status_display', 'findings', 'recovered_amount',
            'created_at', 'updated_at'
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return ''

    def get_leakage_alert_details(self, obj):
        if obj.leakage_alert:
            return {
                'id': str(obj.leakage_alert.id),
                'type': obj.leakage_alert.leakage_type,
                'department': obj.leakage_alert.department,
                'amount': str(obj.leakage_alert.estimated_amount),
                'risk_score': obj.leakage_alert.risk_score
            }
        return None

    def get_risk_signal_details(self, obj):
        if obj.risk_signal:
            return {
                'id': str(obj.risk_signal.id),
                'code': obj.risk_signal.signal_code,
                'severity': obj.risk_signal.severity,
                'description': obj.risk_signal.description
            }
        return None


# --- PHASE 3: GENERAL LEDGER BRIDGE SERIALIZERS ---

class GeneralLedgerLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneralLedgerLineItem
        fields = [
            'id', 'account_code', 'account_name', 'debit_amount',
            'credit_amount', 'department', 'description'
        ]


class GeneralLedgerJournalEntrySerializer(serializers.ModelSerializer):
    lines = GeneralLedgerLineItemSerializer(many=True, read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    receipt_number = serializers.CharField(source='receipt.receipt_number', read_only=True)
    posted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GeneralLedgerJournalEntry
        fields = [
            'id', 'journal_reference', 'entry_date', 'timestamp',
            'invoice', 'invoice_number', 'receipt', 'receipt_number', 'source_type',
            'narration', 'total_debit', 'total_credit', 'is_balanced',
            'posted_by', 'posted_by_name', 'created_at', 'lines'
        ]

    def get_posted_by_name(self, obj):
        if obj.posted_by:
            return obj.posted_by.get_full_name() or obj.posted_by.username
        return 'System Auto-Posting'






