from django.urls import re_path
from .views import LabTestListCreateView, LabOrderListCreateView, LabOrderStatusView

urlpatterns = [
    re_path(r'^/tests/?$', LabTestListCreateView.as_view(), name='lab-tests'),
    re_path(r'^/orders/?$', LabOrderListCreateView.as_view(), name='lab-orders'),
    re_path(r'^/orders/(?P<pk>[0-9a-fA-F-]+)/stage/?$', LabOrderStatusView.as_view(), name='lab-order-stage'),
]
