"""
URL configuration for core app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import VacancyViewSet, ApplicationViewSet, SkillRequirementViewSet


app_name = 'core'

# Router for viewsets
router = DefaultRouter()
router.register(r'skill-requirements', SkillRequirementViewSet, basename='skill-requirement')
router.register(r'vacancies', VacancyViewSet, basename='vacancy')
router.register(r'applications', ApplicationViewSet, basename='application')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]
