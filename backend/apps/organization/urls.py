from django.urls import re_path
from .views import ProfileView, BedsListView, BedStatusView, DepartmentsListView

urlpatterns = [
    re_path(r'^/profile/?$', ProfileView.as_view(), name='org-profile'),
    re_path(r'^/beds/?$', BedsListView.as_view(), name='org-beds'),
    re_path(r'^/beds/(?P<pk>[0-9a-fA-F-]+)/status/?$', BedStatusView.as_view(), name='org-bed-status'),
    re_path(r'^/departments/?$', DepartmentsListView.as_view(), name='org-departments'),
]
