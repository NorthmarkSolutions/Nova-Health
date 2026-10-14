from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from . import admin_views as adm
from .views import LabTestViewSet, LabOrderViewSet, LabReportViewSet, EquipmentViewSet, CriticalCallbackViewSet

router = DefaultRouter()
router.register(r'tests', LabTestViewSet, basename='lab-test')
router.register(r'orders', LabOrderViewSet, basename='lab-order')
router.register(r'reports', LabReportViewSet, basename='lab-report')
router.register(r'equipment', EquipmentViewSet, basename='lab-equipment')
router.register(r'callbacks', CriticalCallbackViewSet, basename='lab-callback')

urlpatterns = [
    # Paths without a trailing slash (older callers) go to the same handlers as the router
    re_path(r'^/?tests/?$', LabTestViewSet.as_view({'get': 'list', 'post': 'create'}), name='legacy-lab-tests'),
    re_path(r'^/?orders/?$', LabOrderViewSet.as_view({'get': 'list', 'post': 'create'}), name='legacy-lab-orders'),
    # Lab Admin (Phase 4)
    path('admin/state/', adm.LabAdminStateView.as_view(), name='lab-admin-state'),
    path('admin/pricing/', adm.LabPricingView.as_view(), name='lab-admin-pricing'),
    path('admin/staff/candidates/', adm.StaffCandidatesView.as_view(), name='lab-admin-staff-candidates'),
    path('admin/staff/', adm.StaffView.as_view(), name='lab-admin-staff'),
    path('admin/staff/<uuid:pk>/', adm.StaffDetailView.as_view(), name='lab-admin-staff-detail'),
    path('admin/roster/shift/', adm.RosterShiftView.as_view(), name='lab-admin-roster-shift'),
    path('admin/roster/publish/', adm.RosterPublishView.as_view(), name='lab-admin-roster-publish'),
    path('admin/roster/next-week/', adm.RosterNextWeekView.as_view(), name='lab-admin-roster-next'),
    path('admin/requests/', adm.StaffRequestsView.as_view(), name='lab-admin-requests'),
    path('admin/requests/<uuid:pk>/decide/', adm.StaffRequestDecideView.as_view(), name='lab-admin-request-decide'),
    path('admin/equipment/<str:code>/log/', adm.EquipmentLogView.as_view(), name='lab-admin-equipment-log'),
    path('admin/analyzers/', adm.AnalyzerRegisterView.as_view(), name='lab-admin-analyzers'),
    path('admin/stock/', adm.StockView.as_view(), name='lab-admin-stock'),
    path('admin/purchases/', adm.PurchaseView.as_view(), name='lab-admin-purchases'),
    path('admin/purchases/<uuid:pk>/status/', adm.PurchaseStatusView.as_view(), name='lab-admin-purchase-status'),
    path('admin/pricing/draft/', adm.PriceDraftView.as_view(), name='lab-admin-price-draft'),
    path('admin/pricing/discard/', adm.PriceDraftDiscardView.as_view(), name='lab-admin-price-discard'),
    path('admin/pricing/submit/', adm.PriceSubmitView.as_view(), name='lab-admin-price-submit'),
    path('admin/settings/', adm.SettingsView.as_view(), name='lab-admin-settings'),
    path('', include(router.urls)),
]
