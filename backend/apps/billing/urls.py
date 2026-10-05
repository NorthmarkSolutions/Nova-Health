from django.urls import re_path
from .views import (
    InvoiceListCreateView, InvoiceDetailView, PaymentCreateView,
    TariffListCreateView, TariffDetailView,
    ServicePackageListCreateView, ServicePackageDetailView,
    CorporateAccountListCreateView, CorporateAccountDetailView,
    PricingQuoteCalculateView,
    CashierQueueView, MultiTenderPaymentView,
    ShiftOpenView, ShiftCurrentView, ShiftCloseView,
    InvoiceReceiptDetailView
)

urlpatterns = [
    re_path(r'^/invoices/?$', InvoiceListCreateView.as_view(), name='invoice-list-create'),
    re_path(r'^/invoices/(?P<pk>[0-9a-fA-F-]+)/?$', InvoiceDetailView.as_view(), name='invoice-detail'),
    re_path(r'^/invoices/(?P<pk>[^/]+)/receipt/?$', InvoiceReceiptDetailView.as_view(), name='invoice-receipt-detail'),
    re_path(r'^/payments/?$', PaymentCreateView.as_view(), name='payment-create'),
    re_path(r'^/payments/multi-tender/?$', MultiTenderPaymentView.as_view(), name='payment-multi-tender'),
    
    # Phase 2: Tariff Master, Packages & Corporate/TPA Pricing
    re_path(r'^/tariffs/?$', TariffListCreateView.as_view(), name='tariff-list-create'),
    re_path(r'^/tariffs/(?P<pk>[^/]+)/?$', TariffDetailView.as_view(), name='tariff-detail'),
    re_path(r'^/packages/?$', ServicePackageListCreateView.as_view(), name='package-list-create'),
    re_path(r'^/packages/(?P<pk>[^/]+)/?$', ServicePackageDetailView.as_view(), name='package-detail'),
    re_path(r'^/corporate-accounts/?$', CorporateAccountListCreateView.as_view(), name='corporate-account-list-create'),
    re_path(r'^/corporate-accounts/(?P<pk>[^/]+)/?$', CorporateAccountDetailView.as_view(), name='corporate-account-detail'),
    re_path(r'^/pricing/calculate-quote/?$', PricingQuoteCalculateView.as_view(), name='pricing-calculate-quote'),

    # Phase 3: Frontline Cashier Workspace & Shift POS
    re_path(r'^/cashier/queue/?$', CashierQueueView.as_view(), name='cashier-queue'),
    re_path(r'^/shifts/open/?$', ShiftOpenView.as_view(), name='shift-open'),
    re_path(r'^/shifts/current/?$', ShiftCurrentView.as_view(), name='shift-current'),
    re_path(r'^/shifts/close/?$', ShiftCloseView.as_view(), name='shift-close'),
]

