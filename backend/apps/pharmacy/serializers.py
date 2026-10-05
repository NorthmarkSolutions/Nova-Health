from rest_framework import serializers
from django.utils import timezone
from apps.pharmacy.models import (
    PharmacyMedicine,
    PharmacySupplier,
    PharmacyPurchaseRequest,
    PharmacyPurchaseRequestItem,
    PharmacyPurchaseOrder,
    PharmacyPurchaseOrderItem,
    PharmacyBatch,
    PharmacyStockTransaction,
    PharmacyDispenseOrder,
    PharmacyDispenseOrderItem,
    PharmacyOTCSale,
    PharmacyOTCSaleItem,
    PharmacyReturn,
    PharmacyReturnItem,
    PharmacyControlledDrugRegister,
    PharmacyVaultReconciliation,
    PharmacyGoodsReceipt,
    PharmacyGoodsReceiptItem,
    PharmacyStockAdjustment,
    PharmacyTransferRequest,
    PharmacyCounterShift,
    PharmacyDutySchedule,
    PharmacyGovernanceAuditLog,
    PharmacyDepartmentSetting,
)

# ==========================================
# 1. MEDICINES & SUPPLIERS SERIALIZERS
# ==========================================

class PharmacyBatchSummarySerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    months_left = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyBatch
        fields = [
            'id', 'batch_number', 'expiry_date', 'initial_quantity',
            'available_quantity', 'cost_price', 'status', 'is_quarantined',
            'supplier_name', 'grn_reference', 'storage_location', 'months_left'
        ]

    def get_months_left(self, obj):
        today = timezone.now().date()
        return (obj.expiry_date.year - today.year) * 12 + (obj.expiry_date.month - today.month)


class PharmacyMedicineSerializer(serializers.ModelSerializer):
    available_stock = serializers.SerializerMethodField()
    supplier_name = serializers.ReadOnlyField(source='default_supplier.name')
    active_pr = serializers.SerializerMethodField()
    batches = PharmacyBatchSummarySerializer(many=True, read_only=True)

    class Meta:
        model = PharmacyMedicine
        fields = '__all__'

    def get_available_stock(self, obj):
        active_batches = obj.batches.filter(
            is_quarantined=False,
            expiry_date__gte=timezone.now().date(),
            status__in=['ACTIVE', 'Active']
        )
        return sum(batch.available_quantity for batch in active_batches)

    def get_active_pr(self, obj):
        # Return latest open purchase request if any
        pr_item = PharmacyPurchaseRequestItem.objects.filter(
            medicine=obj,
            purchase_request__status__in=['Draft', 'Pending approval', 'Approved', 'PO issued', 'Receiving', 'SUBMITTED', 'UNDER_REVIEW']
        ).select_related('purchase_request').order_by('-purchase_request__created_at').first()

        if pr_item:
            pr = pr_item.purchase_request
            return {
                'id': str(pr.id),
                'pr_number': pr.pr_number,
                'status': pr.status,
                'stage': pr.workflow_stage,
                'qty': pr_item.requested_quantity
            }
        return None


class PharmacySupplierSerializer(serializers.ModelSerializer):
    open_prs_count = serializers.SerializerMethodField()

    class Meta:
        model = PharmacySupplier
        fields = '__all__'

    def get_open_prs_count(self, obj):
        return obj.purchase_requests.filter(
            status__in=['Draft', 'Pending approval', 'Approved', 'PO issued', 'Receiving', 'SUBMITTED', 'UNDER_REVIEW']
        ).count()


# ==========================================
# 2. PURCHASE REQUEST SERIALIZERS
# ==========================================

class PharmacyPurchaseRequestItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')

    class Meta:
        model = PharmacyPurchaseRequestItem
        fields = '__all__'


class PharmacyPurchaseRequestSerializer(serializers.ModelSerializer):
    items = PharmacyPurchaseRequestItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.ReadOnlyField(source='requested_by.get_full_name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.get_full_name')
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    supplier_lead_days = serializers.ReadOnlyField(source='supplier.lead_time_days')
    medicine_id = serializers.SerializerMethodField()
    medicine_name = serializers.SerializerMethodField()
    medicine_code = serializers.SerializerMethodField()
    requested_quantity = serializers.SerializerMethodField()
    total_estimated_value = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyPurchaseRequest
        fields = '__all__'

    def get_first_item(self, obj):
        return obj.items.select_related('medicine').first()

    def get_medicine_id(self, obj):
        item = self.get_first_item(obj)
        return str(item.medicine.id) if item else None

    def get_medicine_name(self, obj):
        item = self.get_first_item(obj)
        return item.medicine.name if item else 'Multiple items'

    def get_medicine_code(self, obj):
        item = self.get_first_item(obj)
        return item.medicine.item_code if item else ''

    def get_requested_quantity(self, obj):
        item = self.get_first_item(obj)
        return item.requested_quantity if item else sum(i.requested_quantity for i in obj.items.all())

    def get_total_estimated_value(self, obj):
        return float(sum(i.requested_quantity * float(i.estimated_unit_cost) for i in obj.items.all()))


# ==========================================
# 3. PURCHASE ORDER SERIALIZERS
# ==========================================

class PharmacyPurchaseOrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')

    class Meta:
        model = PharmacyPurchaseOrderItem
        fields = '__all__'


class PharmacyPurchaseOrderSerializer(serializers.ModelSerializer):
    items = PharmacyPurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.get_full_name')
    pr_number = serializers.ReadOnlyField(source='purchase_request.pr_number')

    class Meta:
        model = PharmacyPurchaseOrder
        fields = '__all__'


# ==========================================
# 4. BATCH & AUDIT TRANSACTION SERIALIZERS
# ==========================================

class PharmacyBatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    medicine_category = serializers.ReadOnlyField(source='medicine.category')
    medicine_schedule = serializers.ReadOnlyField(source='medicine.schedule')
    is_narcotic = serializers.ReadOnlyField(source='medicine.is_narcotic')
    is_cold_chain = serializers.ReadOnlyField(source='medicine.is_cold_chain')
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    received_by_name = serializers.ReadOnlyField(source='received_by.get_full_name')
    months_left = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyBatch
        fields = '__all__'

    def get_months_left(self, obj):
        today = timezone.now().date()
        return (obj.expiry_date.year - today.year) * 12 + (obj.expiry_date.month - today.month)


class PharmacyStockTransactionSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    performed_by_name = serializers.ReadOnlyField(source='performed_by.get_full_name')

    class Meta:
        model = PharmacyStockTransaction
        fields = '__all__'


# ==========================================
# 5. DISPENSE ORDER SERIALIZERS
# ==========================================

class PharmacyDispenseOrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    medicine_generic = serializers.ReadOnlyField(source='medicine.generic_name')
    medicine_schedule = serializers.ReadOnlyField(source='medicine.schedule')
    is_narcotic = serializers.ReadOnlyField(source='medicine.is_narcotic')
    is_cold_chain = serializers.ReadOnlyField(source='medicine.is_cold_chain')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    expiry_date = serializers.ReadOnlyField(source='batch.expiry_date')
    suggested_fefo_batch = serializers.SerializerMethodField()
    total_available_stock = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyDispenseOrderItem
        fields = '__all__'

    def get_suggested_fefo_batch(self, obj):
        from apps.pharmacy.services import PharmacyStockService
        batches = PharmacyStockService.get_active_batches(obj.medicine_id)
        first_batch = batches.first()
        if first_batch:
            return {
                'id': str(first_batch.id),
                'batch_number': first_batch.batch_number,
                'expiry_date': str(first_batch.expiry_date),
                'available_quantity': first_batch.available_quantity,
            }
        return None

    def get_total_available_stock(self, obj):
        from apps.pharmacy.services import PharmacyStockService
        return PharmacyStockService.get_medicine_stock(obj.medicine_id)


class PharmacyDispenseOrderSerializer(serializers.ModelSerializer):
    items = PharmacyDispenseOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.ReadOnlyField(source='patient.uhid')
    patient_gender = serializers.ReadOnlyField(source='patient.gender')
    patient_allergies = serializers.ReadOnlyField(source='patient.allergies')
    patient_dob = serializers.ReadOnlyField(source='patient.date_of_birth')
    dispensed_by_name = serializers.ReadOnlyField(source='dispensed_by.get_full_name')
    prescription_number = serializers.ReadOnlyField(source='prescription.prescription_number')
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyDispenseOrder
        fields = '__all__'

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip()

    def get_items_count(self, obj):
        return obj.items.count()


# ==========================================
# 6. OTC SALES SERIALIZERS
# ==========================================

class PharmacyOTCSaleItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')

    class Meta:
        model = PharmacyOTCSaleItem
        fields = '__all__'


class PharmacyOTCSaleSerializer(serializers.ModelSerializer):
    items = PharmacyOTCSaleItemSerializer(many=True, read_only=True)
    sold_by_name = serializers.ReadOnlyField(source='sold_by.get_full_name')

    class Meta:
        model = PharmacyOTCSale
        fields = '__all__'


# ==========================================
# 7. PHARMACY RETURNS SERIALIZERS
# ==========================================

class PharmacyReturnItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')

    class Meta:
        model = PharmacyReturnItem
        fields = '__all__'


class PharmacyReturnSerializer(serializers.ModelSerializer):
    items = PharmacyReturnItemSerializer(many=True, read_only=True)
    processed_by_name = serializers.ReadOnlyField(source='processed_by.get_full_name')
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.ReadOnlyField(source='patient.uhid')
    original_reference = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyReturn
        fields = '__all__'

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return obj.customer_name or "Walk-in Customer"

    def get_original_reference(self, obj):
        if obj.original_dispense_order:
            return obj.original_dispense_order.order_number
        if obj.original_otc_sale:
            return obj.original_otc_sale.sale_number
        return "—"


# ==========================================
# 8. CONTROLLED DRUG REGISTER SERIALIZER
# ==========================================

class PharmacyControlledDrugRegisterSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    medicine_strength = serializers.ReadOnlyField(source='medicine.strength')
    medicine_schedule = serializers.ReadOnlyField(source='medicine.schedule')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    batch_expiry = serializers.ReadOnlyField(source='batch.expiry_date')
    primary_pharmacist_name = serializers.ReadOnlyField(source='primary_pharmacist.get_full_name')
    witness_staff_name = serializers.ReadOnlyField(source='witness_staff.get_full_name')
    patient_name = serializers.SerializerMethodField()
    patient_uhid = serializers.ReadOnlyField(source='patient.uhid')
    order_number = serializers.ReadOnlyField(source='dispense_order.order_number')

    class Meta:
        model = PharmacyControlledDrugRegister
        fields = '__all__'

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return "Internal / Store"


class PharmacyVaultReconciliationSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    performed_by_name = serializers.ReadOnlyField(source='performed_by.get_full_name')
    witness_staff_name = serializers.ReadOnlyField(source='witness_staff.get_full_name')

    class Meta:
        model = PharmacyVaultReconciliation
        fields = '__all__'


# ==========================================
# 9. GOODS RECEIPTS (GRN) SERIALIZERS
# ==========================================

class PharmacyGoodsReceiptItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyGoodsReceiptItem
        fields = '__all__'

    def get_line_total(self, obj):
        return float(obj.received_quantity * float(obj.unit_cost))


class PharmacyGoodsReceiptSerializer(serializers.ModelSerializer):
    lines = PharmacyGoodsReceiptItemSerializer(many=True, read_only=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    supplier_code = serializers.ReadOnlyField(source='supplier.supplier_code')
    po_number = serializers.ReadOnlyField(source='purchase_order.po_number')
    pr_number = serializers.ReadOnlyField(source='purchase_request.pr_number')
    received_by_name = serializers.ReadOnlyField(source='received_by.get_full_name')
    total_units = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyGoodsReceipt
        fields = '__all__'

    def get_total_units(self, obj):
        return sum(line.received_quantity for line in obj.lines.all())

    def get_total_value(self, obj):
        return float(sum(line.received_quantity * float(line.unit_cost) for line in obj.lines.all()))


# ==========================================
# 10. STOCK ADJUSTMENTS SERIALIZER
# ==========================================

class PharmacyStockAdjustmentSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    medicine_schedule = serializers.ReadOnlyField(source='medicine.schedule')
    is_narcotic = serializers.ReadOnlyField(source='medicine.is_narcotic')
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    adjusted_by_name = serializers.ReadOnlyField(source='adjusted_by.get_full_name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.get_full_name')
    estimated_value = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyStockAdjustment
        fields = '__all__'

    def get_estimated_value(self, obj):
        return float(abs(obj.quantity_delta) * float(obj.medicine.unit_price))


# ==========================================
# 11. TRANSFER REQUESTS SERIALIZER
# ==========================================

class PharmacyTransferRequestSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.name')
    medicine_code = serializers.ReadOnlyField(source='medicine.item_code')
    medicine_schedule = serializers.ReadOnlyField(source='medicine.schedule')
    is_narcotic = serializers.ReadOnlyField(source='medicine.is_narcotic')
    is_cold_chain = serializers.ReadOnlyField(source='medicine.is_cold_chain')
    requested_by_name = serializers.ReadOnlyField(source='requested_by.get_full_name')
    dispatched_by_name = serializers.ReadOnlyField(source='dispatched_by.get_full_name')
    received_by_name = serializers.ReadOnlyField(source='received_by.get_full_name')
    central_stock = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyTransferRequest
        fields = '__all__'

    def get_central_stock(self, obj):
        active_batches = obj.medicine.batches.filter(
            is_quarantined=False,
            expiry_date__gte=timezone.now().date(),
            status__in=['ACTIVE', 'Active']
        )
        return sum(b.available_quantity for b in active_batches)


# ==========================================
# 12. PHARMACY COUNTER SHIFT SERIALIZER
# ==========================================

class PharmacyCounterShiftSerializer(serializers.ModelSerializer):
    pharmacist_name = serializers.ReadOnlyField(source='pharmacist.get_full_name')
    shift_type_display = serializers.CharField(source='get_shift_type_display', read_only=True)
    net_drawer_cash = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyCounterShift
        fields = '__all__'

    def get_net_drawer_cash(self, obj):
        return float(obj.opening_float + obj.cash_collected - obj.refunds_paid)

    def get_total_revenue(self, obj):
        return float(obj.cash_collected + obj.card_collected + obj.upi_collected)


# ==========================================
# 13. DUTY SCHEDULE SERIALIZER (PHASE 8)
# ==========================================

class PharmacyDutyScheduleSerializer(serializers.ModelSerializer):
    staff_names = serializers.SerializerMethodField()
    staff_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=PharmacyDutySchedule.assigned_staff.field.model.objects.all(),
        source='assigned_staff', required=False
    )
    assigned_count = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyDutySchedule
        fields = [
            'id', 'schedule_code', 'day_label', 'shift_slot', 'shift_date',
            'shift_type', 'area', 'required_staff_count', 'assigned_staff',
            'staff_names', 'staff_ids', 'assigned_count', 'status', 'notes',
            'created_at', 'updated_at'
        ]

    def get_staff_names(self, obj):
        return [u.get_full_name() or u.username for u in obj.assigned_staff.all()]

    def get_assigned_count(self, obj):
        return obj.assigned_staff.count()


# ==========================================
# 14. GOVERNANCE AUDIT LOG SERIALIZER (PHASE 8)
# ==========================================

class PharmacyGovernanceAuditLogSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyGovernanceAuditLog
        fields = '__all__'

    def get_time_display(self, obj):
        return obj.timestamp.strftime('%H:%M')


# ==========================================
# 15. DEPARTMENT SETTINGS SERIALIZER (PHASE 8)
# ==========================================

class PharmacyDepartmentSettingSerializer(serializers.ModelSerializer):
    effective_value = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyDepartmentSetting
        fields = '__all__'

    def get_effective_value(self, obj):
        if obj.value_type == 'BOOLEAN':
            return obj.boolean_val
        return obj.string_val


