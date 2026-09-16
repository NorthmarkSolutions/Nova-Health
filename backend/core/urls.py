from django.contrib import admin
from django.urls import path, re_path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    re_path(r'^api/v1/auth', include('apps.accounts.urls')),
    re_path(r'^api/v1/organization', include('apps.organization.urls')),
    re_path(r'^api/v1/patients', include('apps.patients.urls')),
    re_path(r'^api/v1/appointments', include('apps.appointments.urls')),
    re_path(r'^api/v1/clinical', include('apps.clinical.urls')),
    re_path(r'^api/v1/lab', include('apps.lab.urls')),
    re_path(r'^api/v1/ot', include('apps.ot.urls')),
    re_path(r'^api/v1/ipd', include('apps.ipd.urls')),
    re_path(r'^api/v1/billing', include('apps.billing.urls')),
]
