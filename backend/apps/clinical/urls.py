from django.urls import re_path
from .views import ConsultationCreateView, PrescriptionDetailView

urlpatterns = [
    re_path(r'^/consultations/?$', ConsultationCreateView.as_view(), name='consultation-create'),
    re_path(r'^/prescriptions/(?P<pk>[0-9a-fA-F-]+)/?$', PrescriptionDetailView.as_view(), name='prescription-detail'),
]
