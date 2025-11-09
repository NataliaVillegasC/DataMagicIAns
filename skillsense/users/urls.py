"""
URL configuration for users app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    CurrentUserView,
    CandidateViewSet,
    CompanyViewSet,
    CVUploadView,
)

app_name = 'users'

# Router for viewsets
router = DefaultRouter()
router.register(r'candidates', CandidateViewSet, basename='candidate')
router.register(r'companies', CompanyViewSet, basename='company')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # CV upload endpoint (without candidate)
    path('cv/upload/', CVUploadView.as_view(), name='cv-upload'),

    # Include router URLs
    path('', include(router.urls)),
]

