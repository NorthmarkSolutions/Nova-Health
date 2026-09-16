from django.urls import re_path
from .views import InvoiceListCreateView, InvoiceDetailView, PaymentCreateView

urlpatterns = [
    re_path(r'^/invoices/?$', InvoiceListCreateView.as_view(), name='invoice-list-create'),
    re_path(r'^/invoices/(?P<pk>[0-9a-fA-F-]+)/?$', InvoiceDetailView.as_view(), name='invoice-detail'),
    re_path(r'^/payments/?$', PaymentCreateView.as_view(), name='payment-create'),
]
