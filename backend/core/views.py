"""
API views for core app.

Provides endpoints for vacancies, applications, and skill requirements.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.db.models import Q

from .models import Vacancy, Application, SkillRequirement
from .serializers import (
    VacancyListSerializer,
    VacancyDetailSerializer,
    VacancyCreateSerializer,
    VacancyUpdateSerializer,
    ApplicationListSerializer,
    ApplicationDetailSerializer,
    ApplicationCreateSerializer,
    SkillRequirementSerializer,
    SkillRequirementCreateSerializer,
)
from .matching_service import MatchingService


logger = logging.getLogger(__name__)


class IsCompanyMember(permissions.BasePermission):
    """Permission to check if user belongs to the same company as the object."""
    
    def has_object_permission(self, request, view, obj):
        return obj.company == request.user.company


class SkillRequirementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SkillRequirement CRUD operations.
    
    Endpoints:
    - GET /api/skill-requirements/ - List all skill requirements
    - POST /api/skill-requirements/ - Create new skill requirement
    - GET /api/skill-requirements/{id}/ - Get skill requirement detail
    """
    queryset = SkillRequirement.objects.all().select_related('skill', 'occupation')
    serializer_class = SkillRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return SkillRequirementCreateSerializer
        return SkillRequirementSerializer
    
    def get_queryset(self):
        """Filter with optional search."""
        queryset = super().get_queryset()
        
        # Optional search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(skill__element_name__icontains=search) |
                Q(occupation__alternate_title__icontains=search)
            )
        
        return queryset


class VacancyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Vacancy CRUD operations.
    
    Endpoints:
    - GET /api/vacancies/ - List all vacancies (filtered by company)
    - POST /api/vacancies/ - Create new vacancy
    - GET /api/vacancies/{id}/ - Retrieve vacancy details
    - PUT /api/vacancies/{id}/ - Update vacancy
    - PATCH /api/vacancies/{id}/ - Partial update vacancy
    - DELETE /api/vacancies/{id}/ - Delete vacancy
    - GET /api/vacancies/{id}/match-candidates/ - Get matched candidates
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        """Filter vacancies by user's company."""
        user = self.request.user
        return Vacancy.objects.filter(
            company=user.company
        ).select_related(
            'company'
        ).prefetch_related(
            'technologies',
            'skill_requirements',
            'skill_requirements__skill',
            'skill_requirements__occupation',
            'applications'
        ).order_by('-created_at')

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return VacancyListSerializer
        elif self.action == 'create':
            return VacancyCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VacancyUpdateSerializer
        return VacancyDetailSerializer

    def create(self, request, *args, **kwargs):
        """Create new vacancy."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            vacancy = serializer.save()
            
            # Return detailed response
            detail_serializer = VacancyDetailSerializer(vacancy, context={'request': request})
            
            return Response({
                'success': True,
                'message': 'Vacancy created successfully',
                'data': detail_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve vacancy details."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        """Update vacancy."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        
        if serializer.is_valid():
            vacancy = serializer.save()
            detail_serializer = VacancyDetailSerializer(vacancy, context={'request': request})
            
            return Response({
                'success': True,
                'message': 'Vacancy updated successfully',
                'data': detail_serializer.data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete vacancy."""
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Vacancy deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='suggested-applications')
    def suggested_applications(self, request, pk=None):
        """Get AI-suggested applications for this vacancy."""
        vacancy = self.get_object()
        
        suggested = Application.objects.filter(
            vacancy=vacancy,
            status='SUGGESTED'
        ).select_related('candidate').order_by('-affinity_score')
        
        serializer = ApplicationListSerializer(suggested, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'vacancy': {
                'id': str(vacancy.id),
                'title': vacancy.title
            },
            'suggestions_count': suggested.count(),
            'suggestions': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='match-candidates')
    def match_candidates(self, request, pk=None):
        """Manually match candidates to this vacancy."""
        vacancy = self.get_object()
        
        # Get parameters
        min_score = float(request.query_params.get('min_score', 50))
        top_n = int(request.query_params.get('top_n', 10))
        
        # Use matching service
        matcher = MatchingService()
        matches = matcher.match_vacancy_to_candidates(
            vacancy=vacancy,
            min_score=min_score,
            top_n=top_n
        )
        
        return Response({
            'success': True,
            'vacancy': VacancyDetailSerializer(vacancy, context={'request': request}).data,
            'filters': {
                'min_score': min_score,
                'top_n': top_n
            },
            'total_candidates_evaluated': matcher.get_total_candidates(),
            'matching_candidates_count': len(matches),
            'matches': matches
        })


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Application CRUD operations.
    
    Endpoints:
    - GET /api/applications/ - List all applications
    - POST /api/applications/ - Create new application
    - GET /api/applications/{id}/ - Get application detail
    - PATCH /api/applications/{id}/ - Update application
    - DELETE /api/applications/{id}/ - Delete application
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter applications by user's company."""
        user = self.request.user
        return Application.objects.filter(
            vacancy__company=user.company
        ).select_related(
            'vacancy',
            'candidate',
            'candidate__cv_file'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return ApplicationListSerializer
        elif self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """List applications with optional filters."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by status
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by vacancy
        vacancy_filter = request.query_params.get('vacancy', None)
        if vacancy_filter:
            queryset = queryset.filter(vacancy_id=vacancy_filter)
        
        # Filter by candidate
        candidate_filter = request.query_params.get('candidate', None)
        if candidate_filter:
            queryset = queryset.filter(candidate_id=candidate_filter)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create new application with affinity score calculation."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            application = serializer.save()
            
            detail_serializer = ApplicationDetailSerializer(application, context={'request': request})
            
            return Response({
                'success': True,
                'message': 'Application created successfully',
                'data': detail_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update application (usually status)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        
        if serializer.is_valid():
            application = serializer.save()
            detail_serializer = ApplicationDetailSerializer(application, context={'request': request})
            
            return Response({
                'success': True,
                'message': 'Application updated successfully',
                'data': detail_serializer.data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete application."""
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Application deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)
