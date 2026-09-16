from django.urls import re_path
from .views import (
    AppointmentListCreateView,
    AppointmentDetailView,
    AppointmentStatusView,
    AppointmentVitalsView,
)

urlpatterns = [
    re_path(r'^/?$', AppointmentListCreateView.as_view(), name='appointment-list-create'),
    re_path(r'^/(?P<pk>[0-9a-fA-F-]+)/?$', AppointmentDetailView.as_view(), name='appointment-detail'),
    re_path(r'^/(?P<pk>[0-9a-fA-F-]+)/status/?$', AppointmentStatusView.as_view(), name='appointment-status'),
    re_path(r'^/(?P<pk>[0-9a-fA-F-]+)/vitals/?$', AppointmentVitalsView.as_view(), name='appointment-vitals'),
]
