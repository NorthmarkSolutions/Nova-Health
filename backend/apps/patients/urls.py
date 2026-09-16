from django.urls import re_path
from .views import PatientListCreateView, PatientDetailView

urlpatterns = [
    re_path(r'^/?$', PatientListCreateView.as_view(), name='patient-list-create'),
    re_path(r'^/(?P<pk>[^/]+)/?$', PatientDetailView.as_view(), name='patient-detail'),
]
