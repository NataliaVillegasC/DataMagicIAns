"""
API views for data app.

Provides read-only endpoints for technologies, skills, and occupations.
"""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Technology, Skill, OccupationAlternateTitle
from .serializers import TechnologySerializer, SkillSerializer, OccupationAlternateTitleSerializer


class TechnologyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for Technology model.
    
    Endpoints:
    - GET /api/technologies/ - List all technologies
    - GET /api/technologies/{id}/ - Get technology detail
    """
    queryset = Technology.objects.all().select_related('category').order_by('example')
    serializer_class = TechnologySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter technologies with optional search (case-insensitive)."""
        queryset = super().get_queryset()
        
        # Optional search (case-insensitive)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(example__icontains=search)
        
        # Limit results
        limit = self.request.query_params.get('limit', None)
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        return queryset


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for Skill model.
    
    Endpoints:
    - GET /api/skills/ - List all skills
    - GET /api/skills/{id}/ - Get skill detail
    """
    queryset = Skill.objects.all().order_by('element_name')
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter skills with optional search (case-insensitive)."""
        queryset = super().get_queryset()
        
        # Optional search (case-insensitive)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(element_name__icontains=search)
        
        # Limit results
        limit = self.request.query_params.get('limit', None)
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        return queryset


class OccupationAlternateTitleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for OccupationAlternateTitle model.
    
    Endpoints:
    - GET /api/occupations/ - List all occupations
    - GET /api/occupations/{id}/ - Get occupation detail
    """
    queryset = OccupationAlternateTitle.objects.all().select_related('occupation').order_by('alternate_title')
    serializer_class = OccupationAlternateTitleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter occupations with optional search (case-insensitive)."""
        queryset = super().get_queryset()
        
        # Optional search (case-insensitive)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(alternate_title__icontains=search) |
                Q(occupation__title__icontains=search)
            )
        
        # Limit results
        limit = self.request.query_params.get('limit', None)
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        return queryset
