from django.urls import path
from .views import (
    InboundFinancialEventView,
    DayEndReconciliationView,
    PharmacyReconciliationView,
    PharmacyValuationView,
    PharmacyWriteOffDecisionView,
    VendorBankVerificationView,
    UnbilledRevenueSummaryView,
    UnbilledAccrualGenerateView,
    AutoReversalAccrualView,
    OTImplantMatchingView,
    LabAccrualBatchView, LabPartnerInvoiceMatchView, LabServiceLineFeedView,
    LabGLReconciliationView, OutsourcedTestAccrualListView
)

urlpatterns = [
    path('events', InboundFinancialEventView.as_view(), name='integration-inbound-events'),
    path('reconcile-day-end', DayEndReconciliationView.as_view(), name='integration-reconcile-day-end'),
    path('reconcile-pharmacy-stock', PharmacyReconciliationView.as_view(), name='integration-reconcile-pharmacy-stock'),
    path('pharmacy-valuation', PharmacyValuationView.as_view(), name='integration-pharmacy-valuation'),
    path('writeoff-decision', PharmacyWriteOffDecisionView.as_view(), name='integration-writeoff-decision'),
    path('writeoff-decision/<str:pk>', PharmacyWriteOffDecisionView.as_view(), name='integration-writeoff-decision-pk'),
    path('verify-vendor-bank', VendorBankVerificationView.as_view(), name='integration-verify-vendor-bank'),
    path('verify-vendor-bank/<str:pk>', VendorBankVerificationView.as_view(), name='integration-verify-vendor-bank-pk'),
    # Phase 9: Clinical integration routes
    path('unbilled-revenue-summary', UnbilledRevenueSummaryView.as_view(), name='integration-unbilled-revenue-summary'),
    path('generate-unbilled-accrual', UnbilledAccrualGenerateView.as_view(), name='integration-generate-unbilled-accrual'),
    path('execute-accrual-reversal', AutoReversalAccrualView.as_view(), name='integration-execute-accrual-reversal'),
    path('match-ot-implant', OTImplantMatchingView.as_view(), name='integration-match-ot-implant'),
    path('match-ot-implant/<str:pk>', OTImplantMatchingView.as_view(), name='integration-match-ot-implant-pk'),
    # Phase 10: Lab integration routes
    path('lab/accruals', OutsourcedTestAccrualListView.as_view(), name='integration-lab-accruals'),
    path('lab/accrual-batch', LabAccrualBatchView.as_view(), name='integration-lab-accrual-batch'),
    path('lab/match-invoice/<str:pk>', LabPartnerInvoiceMatchView.as_view(), name='integration-lab-match-invoice'),
    path('lab/service-line-feed', LabServiceLineFeedView.as_view(), name='integration-lab-service-line-feed'),
    path('lab/reconciliation', LabGLReconciliationView.as_view(), name='integration-lab-reconciliation'),
]

