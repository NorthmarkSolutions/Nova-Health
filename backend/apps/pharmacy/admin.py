from django.contrib import admin
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
    PharmacyGoodsReceipt,
    PharmacyGoodsReceiptItem,
    PharmacyStockAdjustment,
    PharmacyTransferRequest,
)

class PharmacyPurchaseRequestItemInline(admin.TabularInline):
    model = PharmacyPurchaseRequestItem
    extra = 0

@admin.register(PharmacyPurchaseRequest)
class PharmacyPurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('pr_number', 'requested_by', 'priority', 'status', 'approved_by', 'created_at')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('pr_number', 'requested_by__username', 'notes')
    inlines = [PharmacyPurchaseRequestItemInline]

class PharmacyPurchaseOrderItemInline(admin.TabularInline):
    model = PharmacyPurchaseOrderItem
    extra = 0

@admin.register(PharmacyPurchaseOrder)
class PharmacyPurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'supplier', 'status', 'total_order_amount', 'issued_at', 'expected_delivery_date')
    list_filter = ('status', 'issued_at')
    search_fields = ('po_number', 'supplier__name')
    inlines = [PharmacyPurchaseOrderItemInline]

@admin.register(PharmacyMedicine)
class PharmacyMedicineAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_code', 'category', 'strength', 'unit_price', 'cost_price', 'is_narcotic', 'is_active')
    list_filter = ('category', 'is_narcotic', 'requires_prescription', 'is_high_risk', 'is_active')
    search_fields = ('name', 'item_code', 'generic_name')

@admin.register(PharmacySupplier)
class PharmacySupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'supplier_code', 'contact_person', 'phone', 'drug_license_number', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'supplier_code', 'drug_license_number')

@admin.register(PharmacyBatch)
class PharmacyBatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'medicine', 'expiry_date', 'available_quantity', 'cost_price', 'status', 'is_quarantined')
    list_filter = ('status', 'is_quarantined', 'expiry_date')
    search_fields = ('batch_number', 'medicine__name', 'storage_location')

@admin.register(PharmacyStockTransaction)
class PharmacyStockTransactionAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'medicine', 'transaction_type', 'quantity_delta', 'balance_after', 'reference_type', 'performed_by')
    list_filter = ('transaction_type', 'reference_type', 'created_at')
    search_fields = ('medicine__name', 'performed_by__username')
    readonly_fields = [f.name for f in PharmacyStockTransaction._meta.fields]

class PharmacyDispenseOrderItemInline(admin.TabularInline):
    model = PharmacyDispenseOrderItem
    extra = 0

@admin.register(PharmacyDispenseOrder)
class PharmacyDispenseOrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'patient', 'encounter_type', 'settlement_mode', 'payment_status', 'total_amount', 'status', 'dispensed_at')
    list_filter = ('encounter_type', 'settlement_mode', 'payment_status', 'status')
    search_fields = ('order_number', 'patient__uhid', 'patient__first_name', 'patient__last_name')
    inlines = [PharmacyDispenseOrderItemInline]

class PharmacyOTCSaleItemInline(admin.TabularInline):
    model = PharmacyOTCSaleItem
    extra = 0

@admin.register(PharmacyOTCSale)
class PharmacyOTCSaleAdmin(admin.ModelAdmin):
    list_display = ('sale_number', 'customer_name', 'total_amount', 'payment_mode', 'cashier_settled', 'sold_by', 'created_at')
    list_filter = ('payment_mode', 'cashier_settled', 'created_at')
    search_fields = ('sale_number', 'customer_name', 'customer_phone')
    inlines = [PharmacyOTCSaleItemInline]

class PharmacyReturnItemInline(admin.TabularInline):
    model = PharmacyReturnItem
    extra = 0

@admin.register(PharmacyReturn)
class PharmacyReturnAdmin(admin.ModelAdmin):
    list_display = ('return_number', 'original_dispense_order', 'patient', 'return_type', 'total_refund_amount', 'created_at')
    list_filter = ('return_type', 'created_at')
    search_fields = ('return_number', 'patient__uhid', 'reason')
    inlines = [PharmacyReturnItemInline]

@admin.register(PharmacyControlledDrugRegister)
class PharmacyControlledDrugRegisterAdmin(admin.ModelAdmin):
    list_display = ('entry_number', 'medicine', 'batch', 'patient', 'quantity_dispensed', 'balance_stock_after', 'primary_pharmacist', 'witness_staff', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('entry_number', 'medicine__name', 'prescribing_doctor_name', 'doctor_license_number', 'patient__uhid')
    readonly_fields = [f.name for f in PharmacyControlledDrugRegister._meta.fields]


class PharmacyGoodsReceiptItemInline(admin.TabularInline):
    model = PharmacyGoodsReceiptItem
    extra = 0


@admin.register(PharmacyGoodsReceipt)
class PharmacyGoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ('grn_number', 'supplier', 'invoice_number', 'status', 'is_cold_chain', 'received_by', 'received_at')
    list_filter = ('status', 'is_cold_chain', 'received_at')
    search_fields = ('grn_number', 'invoice_number', 'supplier__name')
    inlines = [PharmacyGoodsReceiptItemInline]


@admin.register(PharmacyStockAdjustment)
class PharmacyStockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('adjustment_number', 'medicine', 'batch', 'quantity_delta', 'reason', 'status', 'adjusted_by', 'approved_by', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('adjustment_number', 'medicine__name', 'batch__batch_number')


@admin.register(PharmacyTransferRequest)
class PharmacyTransferRequestAdmin(admin.ModelAdmin):
    list_display = ('transfer_number', 'medicine', 'quantity', 'destination', 'status', 'requested_by', 'created_at')
    list_filter = ('status', 'destination', 'created_at')
    search_fields = ('transfer_number', 'medicine__name', 'destination')

