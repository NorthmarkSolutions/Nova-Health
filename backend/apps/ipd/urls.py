from django.urls import re_path
from .views import (
    AdmissionListCreateView,
    AdmissionDetailView,
    AdmissionStatusView,
    AdmissionDischargeView,
    MARListView,
    MARToggleView,
)

urlpatterns = [
    re_path(r'^/admissions/?$', AdmissionListCreateView.as_view(), name='admission-list-create'),
    re_path(r'^/admissions/(?P<pk>[0-9a-fA-F-]+)/?$', AdmissionDetailView.as_view(), name='admission-detail'),
    re_path(r'^/admissions/(?P<pk>[0-9a-fA-F-]+)/status/?$', AdmissionStatusView.as_view(), name='admission-status'),
    re_path(r'^/admissions/(?P<pk>[0-9a-fA-F-]+)/discharge/?$', AdmissionDischargeView.as_view(), name='admission-discharge'),
    re_path(r'^/admissions/(?P<pk>[0-9a-fA-F-]+)/mar/?$', MARListView.as_view(), name='admission-mar-list'),
    re_path(r'^/mar/?$', MARListView.as_view(), name='mar-create'),
    re_path(r'^/mar/(?P<pk>[0-9a-fA-F-]+)/toggle/?$', MARToggleView.as_view(), name='mar-toggle'),
]
