from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.pharmacy.views import (
    InventoryKPIsView,
    InventoryDashboardAlertsView,
    OPDPharmacistKPIsView,
    CompletedTodayView,
    PharmacyMedicineViewSet,
    PharmacyBatchViewSet,
    PharmacyPurchaseRequestViewSet,
    PharmacyGoodsReceiptViewSet,
    PharmacySupplierViewSet,
    PharmacyStockAdjustmentViewSet,
    PharmacyTransferRequestViewSet,
    PharmacyControlledDrugRegisterViewSet,
    PharmacyDispenseOrderViewSet,
    PharmacyOTCSaleViewSet,
    PharmacyReturnViewSet,
    ClinicalPrescriptionHandoffView,
    AllergyCheckView,
    BillingTPADirectoryView,
    BillingCorporateDirectoryView,
    BillingCreditAccountsView,
    BillingIPDAdmissionStatusView,
    BillingShiftDrawerView,
    ReceptionClearanceWebhookView,
    IPDPharmacistKPIsView,
    IPDPharmacistQueueView,
    IPDPharmacistIssueView,
    IPDPharmacistEmergencyReleaseView,
    IPDPharmacistQueryPrescriberView,
    IPDPharmacistCancelView,
    IPDPharmacistSubstituteView,
    IPDWardReturnsView,
    IPDWardReturnProcessView,
    ControlledDrugVaultInventoryView,
    ControlledDrugRegisterReportView,
    ControlledDrugSummaryMetricsView,
    ControlledDrugEligibleWitnessesView,
    ControlledDrugVerifyWitnessView,
    ControlledDrugDispenseView,
    ControlledDrugReconcileView,
    ControlledDrugExportReportView,
    PharmacyAdminAnalyticsView,
    PharmacyAdminStaffView,
    PharmacyAdminShiftsView,
    PharmacyAdminOperationsView,
    PharmacyAdminInventoryHealthView,
    PharmacyAdminSuppliersView,
    PharmacyAdminAuditLogsView,
    PharmacyAdminSettingsView,
    PharmacyPurchaseRequestReviewView,
    PharmacyPurchaseOrderIssueView,
    PharmacyPurchaseOrderViewSet,
    PharmacyMedicinePricingView,
)
from apps.pharmacy.inventory_views import (
    InventoryExtendedKPIsView,
    InventoryDemandQueueView,
    InventoryDemandFulfillView,
    InventoryDeadStockView,
    InventoryForecastingView,
    InventoryReconciliationView,
    PharmacyMedicineArchiveView,
    PharmacyMedicineRestoreView,
    PharmacyBatchQuarantineView,
    PharmacyBatchVendorReturnView,
    PharmacyBatchDestroyView,
)
from apps.pharmacy.ipd_views import (
    IPDOperationsQueueView,
    IPDOperationsKPIsView,
    IPDAllocationUpdateView,
    IPDPrescriberApprovalView,
    IPDWardHandoverTrackingView,
    IPDMARStatusUpdateView,
    IPDWardReturnClassificationView,
)

router = DefaultRouter()
router.register(r'medicines', PharmacyMedicineViewSet, basename='pharmacy-medicines')
router.register(r'batches', PharmacyBatchViewSet, basename='pharmacy-batches')
router.register(r'purchase-requests', PharmacyPurchaseRequestViewSet, basename='pharmacy-prs')
router.register(r'purchase-orders', PharmacyPurchaseOrderViewSet, basename='pharmacy-pos')
router.register(r'goods-receipts', PharmacyGoodsReceiptViewSet, basename='pharmacy-grns')
router.register(r'suppliers', PharmacySupplierViewSet, basename='pharmacy-suppliers')
router.register(r'stock-adjustments', PharmacyStockAdjustmentViewSet, basename='pharmacy-adjustments')
router.register(r'transfers', PharmacyTransferRequestViewSet, basename='pharmacy-transfers')
router.register(r'controlled-drugs', PharmacyControlledDrugRegisterViewSet, basename='pharmacy-cds')
router.register(r'dispense-orders', PharmacyDispenseOrderViewSet, basename='pharmacy-dispense-orders')
router.register(r'dispense-queue', PharmacyDispenseOrderViewSet, basename='pharmacy-dispense-queue')
router.register(r'otc-sales', PharmacyOTCSaleViewSet, basename='pharmacy-otc-sales')
router.register(r'returns', PharmacyReturnViewSet, basename='pharmacy-returns')

urlpatterns = [
    path('inventory/kpis/', InventoryKPIsView.as_view(), name='pharmacy-inventory-kpis'),
    path('inventory/alerts/', InventoryDashboardAlertsView.as_view(), name='pharmacy-inventory-alerts'),
    path('opd/kpis/', OPDPharmacistKPIsView.as_view(), name='pharmacy-opd-kpis'),
    path('completed-today/', CompletedTodayView.as_view(), name='pharmacy-completed-today'),
    path('prescriptions/handoff/', ClinicalPrescriptionHandoffView.as_view(), name='pharmacy-prescription-handoff'),
    path('prescriptions/check-allergies/', AllergyCheckView.as_view(), name='pharmacy-check-allergies'),
    # Phase 5: Billing Settlement Engines & Shift Drawer
    path('billing/tpa-directory/', BillingTPADirectoryView.as_view(), name='pharmacy-billing-tpa-directory'),
    path('billing/corporate-directory/', BillingCorporateDirectoryView.as_view(), name='pharmacy-billing-corporate-directory'),
    path('billing/credit-accounts/', BillingCreditAccountsView.as_view(), name='pharmacy-billing-credit-accounts'),
    path('billing/ipd-admission-status/', BillingIPDAdmissionStatusView.as_view(), name='pharmacy-billing-ipd-admission-status'),
    path('billing/shift-drawer/', BillingShiftDrawerView.as_view(), name='pharmacy-billing-shift-drawer'),
    path('billing/reception-webhook/', ReceptionClearanceWebhookView.as_view(), name='pharmacy-billing-reception-webhook'),
    # Phase 6: IPD Pharmacist & Inpatient Ward Supply
    path('ipd/kpis/', IPDOperationsKPIsView.as_view(), name='pharmacy-ipd-kpis'),
    path('ipd/queue/', IPDOperationsQueueView.as_view(), name='pharmacy-ipd-queue'),
    path('ipd/issue/', IPDPharmacistIssueView.as_view(), name='pharmacy-ipd-issue'),
    path('ipd/issue/<uuid:pk>/', IPDPharmacistIssueView.as_view(), name='pharmacy-ipd-issue-pk'),
    path('ipd/emergency-release/', IPDPharmacistEmergencyReleaseView.as_view(), name='pharmacy-ipd-emergency-release'),
    path('ipd/emergency-release/<uuid:pk>/', IPDPharmacistEmergencyReleaseView.as_view(), name='pharmacy-ipd-emergency-release-pk'),
    path('ipd/query-prescriber/', IPDPharmacistQueryPrescriberView.as_view(), name='pharmacy-ipd-query-prescriber'),
    path('ipd/query-prescriber/<uuid:pk>/', IPDPharmacistQueryPrescriberView.as_view(), name='pharmacy-ipd-query-prescriber-pk'),
    path('ipd/cancel/', IPDPharmacistCancelView.as_view(), name='pharmacy-ipd-cancel'),
    path('ipd/cancel/<uuid:pk>/', IPDPharmacistCancelView.as_view(), name='pharmacy-ipd-cancel-pk'),
    path('ipd/substitute/', IPDPharmacistSubstituteView.as_view(), name='pharmacy-ipd-substitute'),
    path('ipd/substitute/<uuid:pk>/', IPDPharmacistSubstituteView.as_view(), name='pharmacy-ipd-substitute-pk'),
    path('ipd/substitute-approval/', IPDPrescriberApprovalView.as_view(), name='pharmacy-ipd-substitute-approval'),
    path('ipd/substitute-approval/<uuid:pk>/', IPDPrescriberApprovalView.as_view(), name='pharmacy-ipd-substitute-approval-pk'),
    path('ipd/allocation/', IPDAllocationUpdateView.as_view(), name='pharmacy-ipd-allocation'),
    path('ipd/allocation/<uuid:pk>/', IPDAllocationUpdateView.as_view(), name='pharmacy-ipd-allocation-pk'),
    path('ipd/handover-tracking/', IPDWardHandoverTrackingView.as_view(), name='pharmacy-ipd-handover-tracking'),
    path('ipd/handover-tracking/<uuid:pk>/', IPDWardHandoverTrackingView.as_view(), name='pharmacy-ipd-handover-tracking-pk'),
    path('ipd/mar-status/', IPDMARStatusUpdateView.as_view(), name='pharmacy-ipd-mar-status'),
    path('ipd/mar-status/<uuid:pk>/', IPDMARStatusUpdateView.as_view(), name='pharmacy-ipd-mar-status-pk'),
    path('ipd/returns/', IPDWardReturnsView.as_view(), name='pharmacy-ipd-returns'),
    path('ipd/returns/<uuid:pk>/process/', IPDWardReturnClassificationView.as_view(), name='pharmacy-ipd-return-process'),
    # Phase 7: Controlled Drug & Narcotic System
    path('controlled-drug/vault-inventory/', ControlledDrugVaultInventoryView.as_view(), name='pharmacy-cd-vault-inventory'),
    path('controlled-drug/register/', ControlledDrugRegisterReportView.as_view(), name='pharmacy-cd-register-report'),
    path('controlled-drug/summary/', ControlledDrugSummaryMetricsView.as_view(), name='pharmacy-cd-summary'),
    path('controlled-drug/eligible-witnesses/', ControlledDrugEligibleWitnessesView.as_view(), name='pharmacy-cd-eligible-witnesses'),
    path('controlled-drug/verify-witness/', ControlledDrugVerifyWitnessView.as_view(), name='pharmacy-cd-verify-witness'),
    path('controlled-drug/dispense/', ControlledDrugDispenseView.as_view(), name='pharmacy-cd-dispense'),
    path('controlled-drug/reconcile/', ControlledDrugReconcileView.as_view(), name='pharmacy-cd-reconcile'),
    path('controlled-drug/export-report/', ControlledDrugExportReportView.as_view(), name='pharmacy-cd-export-report'),
    # Phase 8: Pharmacy Admin & Governance Workspace
    path('admin/analytics/', PharmacyAdminAnalyticsView.as_view(), name='pharmacy-admin-analytics'),
    path('admin/staff/', PharmacyAdminStaffView.as_view(), name='pharmacy-admin-staff'),
    path('admin/shifts/', PharmacyAdminShiftsView.as_view(), name='pharmacy-admin-shifts'),
    path('admin/operations/', PharmacyAdminOperationsView.as_view(), name='pharmacy-admin-operations'),
    path('admin/inventory-health/', PharmacyAdminInventoryHealthView.as_view(), name='pharmacy-admin-inv-health'),
    path('admin/suppliers/', PharmacyAdminSuppliersView.as_view(), name='pharmacy-admin-suppliers'),
    path('admin/audit-logs/', PharmacyAdminAuditLogsView.as_view(), name='pharmacy-admin-audit-logs'),
    path('admin/settings/', PharmacyAdminSettingsView.as_view(), name='pharmacy-admin-settings'),
    path('purchase-requests/<uuid:pk>/review/', PharmacyPurchaseRequestReviewView.as_view(), name='pharmacy-pr-review'),
    path('purchase-orders/<uuid:pk>/issue/', PharmacyPurchaseOrderIssueView.as_view(), name='pharmacy-po-issue'),
    path('medicines/<uuid:pk>/pricing/', PharmacyMedicinePricingView.as_view(), name='pharmacy-medicine-pricing'),
    # Phase 9: Operational Inventory Workspace Endpoints
    path('inventory/extended-kpis/', InventoryExtendedKPIsView.as_view(), name='pharmacy-inventory-extended-kpis'),
    path('inventory/demand/', InventoryDemandQueueView.as_view(), name='pharmacy-inventory-demand-queue'),
    path('inventory/demand/fulfill/', InventoryDemandFulfillView.as_view(), name='pharmacy-inventory-demand-fulfill'),
    path('inventory/dead-stock/', InventoryDeadStockView.as_view(), name='pharmacy-inventory-dead-stock'),
    path('inventory/forecasting/', InventoryForecastingView.as_view(), name='pharmacy-inventory-forecasting'),
    path('inventory/reconciliations/', InventoryReconciliationView.as_view(), name='pharmacy-inventory-reconciliations'),
    path('medicines/<uuid:pk>/archive/', PharmacyMedicineArchiveView.as_view(), name='pharmacy-medicine-archive'),
    path('medicines/<uuid:pk>/restore/', PharmacyMedicineRestoreView.as_view(), name='pharmacy-medicine-restore'),
    path('batches/<uuid:pk>/quarantine/', PharmacyBatchQuarantineView.as_view(), name='pharmacy-batch-quarantine'),
    path('batches/<uuid:pk>/return-to-vendor/', PharmacyBatchVendorReturnView.as_view(), name='pharmacy-batch-vendor-return'),
    path('batches/<uuid:pk>/destroy/', PharmacyBatchDestroyView.as_view(), name='pharmacy-batch-destroy'),
    path('', include(router.urls)),
]


