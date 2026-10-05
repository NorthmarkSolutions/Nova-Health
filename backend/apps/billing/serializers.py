from rest_framework import serializers
from .models import (
    BillingCounter, CounterShift, Invoice, InvoiceItem, Payment,
    PatientDeposit, RefundRequest, TariffMaster, ServicePackage,
    CorporateAccount, FinancialDischargeClearance
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

    class Meta:
        model = Invoice
        fields = [
            'id', 'invNo', 'invoice_number', 'patient', 'patientName', 'uhid', 'phone',
            'category', 'encounter_type', 'date', 'subtotal', 'discount', 'tax',
            'advanceDeducted', 'total', 'paid', 'balance', 'status', 'settlement_mode',
            'token_slip_number', 'tpa_claim_reference', 'corporate_reference',
            'counter', 'counterCode', 'cashier', 'cashierName', 'shift',
            'discount_reason', 'discount_approved_by', 'cancellation_reason',
            'items', 'payments', 'created_at', 'updated_at'
        ]

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
            'credit_note_number', 'created_at'
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
            'emergency_markup_percent', 'gst_rate', 'is_active', 'created_at'
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
    class Meta:
        model = CorporateAccount
        fields = [
            'id', 'code', 'name', 'account_type', 'credit_limit', 'utilized_credit',
            'co_pay_percentage', 'deductible_amount', 'room_rent_ceiling', 'valid_until',
            'is_active', 'created_at'
        ]

class FinancialDischargeClearanceSerializer(serializers.ModelSerializer):
    admissionNumber = serializers.CharField(source='admission.admission_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='admission.patient.uhid', read_only=True)
    finalInvoiceNumber = serializers.CharField(source='final_invoice.invoice_number', read_only=True)
    clearedByName = serializers.SerializerMethodField()

    class Meta:
        model = FinancialDischargeClearance
        fields = [
            'id', 'admission', 'admissionNumber', 'patientName', 'uhid',
            'final_invoice', 'finalInvoiceNumber', 'clearance_status',
            'net_payable', 'deposit_applied', 'insurance_covered', 'patient_paid',
            'cleared_by', 'clearedByName', 'cleared_at', 'qr_verification_token',
            'notes', 'created_at'
        ]

    def get_patientName(self, obj):
        if obj.admission and obj.admission.patient:
            return f"{obj.admission.patient.first_name} {obj.admission.patient.last_name}".strip()
        return ''

    def get_clearedByName(self, obj):
        if obj.cleared_by:
            return obj.cleared_by.get_full_name() or obj.cleared_by.username
        return ''
