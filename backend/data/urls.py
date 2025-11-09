"""
URL configuration for data app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TechnologyViewSet, SkillViewSet, OccupationAlternateTitleViewSet


app_name = 'data'

# Router for viewsets
router = DefaultRouter()
router.register(r'technologies', TechnologyViewSet, basename='technology')
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'occupations', OccupationAlternateTitleViewSet, basename='occupation')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]

