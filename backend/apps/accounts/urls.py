from django.urls import re_path
from .views import LoginView, RegisterView, MeView

urlpatterns = [
    re_path(r'^/login/?$', LoginView.as_view(), name='login'),
    re_path(r'^/register/?$', RegisterView.as_view(), name='register'),
    re_path(r'^/me/?$', MeView.as_view(), name='me'),
]
