from django.urls import re_path
from .views import SurgeryListCreateView, SurgeryDetailView, SurgeryStatusView, SurgeryNotesView

urlpatterns = [
    re_path(r'^/surgeries/?$', SurgeryListCreateView.as_view(), name='surgery-list-create'),
    re_path(r'^/surgeries/(?P<pk>[0-9a-fA-F-]+)/?$', SurgeryDetailView.as_view(), name='surgery-detail'),
    re_path(r'^/surgeries/(?P<pk>[0-9a-fA-F-]+)/status/?$', SurgeryStatusView.as_view(), name='surgery-status'),
    re_path(r'^/surgeries/(?P<pk>[0-9a-fA-F-]+)/notes/?$', SurgeryNotesView.as_view(), name='surgery-notes'),
]
