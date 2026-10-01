from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LabTestViewSet,
    LabOrderViewSet,
    LabReportViewSet,
    EquipmentViewSet,
    LabTestListCreateView,
    LabOrderListCreateView,
    LabOrderStatusView,
)

router = DefaultRouter()
router.register(r'tests', LabTestViewSet, basename='lab-test')
router.register(r'orders', LabOrderViewSet, basename='lab-order')
router.register(r'reports', LabReportViewSet, basename='lab-report')
router.register(r'equipment', EquipmentViewSet, basename='lab-equipment')

urlpatterns = [
    # Legacy compatibility paths (with and without leading slash)
    re_path(r'^/?tests/?$', LabTestListCreateView.as_view(), name='legacy-lab-tests'),
    re_path(r'^/?orders/?$', LabOrderListCreateView.as_view(), name='legacy-lab-orders'),
    re_path(r'^/?orders/(?P<pk>[0-9a-fA-F-]+)/stage/?$', LabOrderStatusView.as_view(), name='legacy-lab-order-stage'),

    # Full ViewSet routing
    path('', include(router.urls)),
]
