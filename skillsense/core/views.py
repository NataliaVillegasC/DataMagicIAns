"""
Views for core app.

Provides API endpoints for Vacancy and Application CRUD operations,
plus sophisticated candidate-vacancy matching.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404

from .models import Vacancy, Application, VacancyStatus
from .serializers import (
    VacancyListSerializer,
    VacancyDetailSerializer,
    VacancyCreateSerializer,
    VacancyUpdateSerializer,
    ApplicationSerializer
)
from .matching_engine import get_vacancy_matcher, get_candidate_ranker, MatchingWeights
from users.models import Candidate


logger = logging.getLogger(__name__)


class IsCompanyMember(permissions.BasePermission):
    """Permission to check if user belongs to the same company as the vacancy."""

    def has_object_permission(self, request, view, obj):
        """Check if user's company matches vacancy's company."""
        return obj.company == request.user.company


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
        """Update vacancy information."""
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

            # Return detailed response
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

    def list(self, request, *args, **kwargs):
        """List vacancies with optional filters."""
        queryset = self.filter_queryset(self.get_queryset())

        # Optional status filter
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Optional search filter
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(title__icontains=search)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='suggested-applications')
    def suggested_applications(self, request, pk=None):
        """
        Get SUGGESTED applications for this vacancy.

        Returns all auto-generated application suggestions with affinity scores.
        """
        vacancy = self.get_object()

        # Get suggested applications
        suggestions = Application.objects.filter(
            vacancy=vacancy,
            status='SUGGESTED'
        ).select_related(
            'candidate',
            'candidate__cv_file'
        ).order_by('-affinity_score')

        # Serialize
        from .serializers import ApplicationSerializer
        serializer = ApplicationSerializer(suggestions, many=True)

        return Response({
            'success': True,
            'vacancy': {
                'id': str(vacancy.id),
                'title': vacancy.title
            },
            'suggestions_count': suggestions.count(),
            'suggestions': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='match-candidates')
    def match_candidates(self, request, pk=None):
        """
        Get candidates matched to this vacancy with affinity scores.

        Query parameters:
        - min_score: Minimum match score (0-100, default: 50)
        - top_n: Number of top candidates to return (default: 10)

        Returns:
        - Ranked list of candidates with match scores and details
        """
        vacancy = self.get_object()

        # Get query parameters
        min_score = float(request.query_params.get('min_score', 50))
        top_n = int(request.query_params.get('top_n', 10))

        # Validate parameters
        if not (0 <= min_score <= 100):
            return Response({
                'success': False,
                'message': 'min_score must be between 0 and 100'
            }, status=status.HTTP_400_BAD_REQUEST)

        if top_n < 1:
            return Response({
                'success': False,
                'message': 'top_n must be greater than 0'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prepare vacancy data
        vacancy_required_skills = set(
            vacancy.skill_requirements.filter(required=True).values_list('skill_id', flat=True)
        )
        vacancy_optional_skills = set(
            vacancy.skill_requirements.filter(required=False).values_list('skill_id', flat=True)
        )
        vacancy_technologies = set(
            vacancy.technologies.values_list('id', flat=True)
        )

        vacancy_data = {
            'required_skills': vacancy_required_skills,
            'optional_skills': vacancy_optional_skills,
            'technologies': vacancy_technologies
        }

        # Get all candidates from same company
        candidates = Candidate.objects.filter(
            registrated_by__company=request.user.company
        ).prefetch_related('skills', 'technologies')

        # Prepare candidates data
        candidates_data = []
        for candidate in candidates:
            candidates_data.append({
                'candidate_id': candidate.id,
                'candidate': candidate,  # Keep reference for response
                'skills': set(candidate.skills.values_list('id', flat=True)),
                'technologies': set(candidate.technologies.values_list('id', flat=True))
            })

        # Use matching engine
        ranker = get_candidate_ranker()
        matches = ranker.get_top_candidates(
            candidates_data=candidates_data,
            vacancy_data=vacancy_data,
            top_n=top_n,
            min_score=min_score
        )

        # Enrich with candidate info
        results = []
        for match in matches:
            # Find candidate object
            candidate = next(
                c['candidate'] for c in candidates_data
                if c['candidate_id'] == match['candidate_id']
            )

            results.append({
                'candidate': {
                    'id': str(candidate.id),
                    'full_name': candidate.full_name,
                    'email': candidate.email,
                    'phone': candidate.phone,
                    'location': candidate.location,
                    'skills_count': candidate.skills.count(),
                    'technologies_count': candidate.technologies.count()
                },
                'match_score': float(match['score']),
                'match_details': match['details']
            })

        return Response({
            'success': True,
            'vacancy': {
                'id': str(vacancy.id),
                'title': vacancy.title,
                'required_skills_count': len(vacancy_required_skills),
                'optional_skills_count': len(vacancy_optional_skills),
                'technologies_count': len(vacancy_technologies)
            },
            'filters': {
                'min_score': min_score,
                'top_n': top_n
            },
            'total_candidates_evaluated': len(candidates_data),
            'matching_candidates_count': len(results),
            'matches': results
        })


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Application CRUD operations.

    Endpoints:
    - GET /api/applications/ - List all applications
    - POST /api/applications/ - Create new application
    - GET /api/applications/{id}/ - Retrieve application details
    - PUT /api/applications/{id}/ - Update application
    - DELETE /api/applications/{id}/ - Delete application
    """

    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter applications by user's company."""
        user = self.request.user
        return Application.objects.filter(
            vacancy__company=user.company
        ).select_related(
            'vacancy',
            'candidate',
            'vacancy__company'
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Create new application and calculate affinity score."""
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # Get vacancy and candidate
            vacancy_id = serializer.validated_data['vacancy'].id
            candidate_id = serializer.validated_data['candidate'].id

            vacancy = get_object_or_404(Vacancy, id=vacancy_id)
            candidate = get_object_or_404(Candidate, id=candidate_id)

            # Calculate affinity score
            matcher = get_vacancy_matcher()

            vacancy_required_skills = set(
                vacancy.skill_requirements.filter(required=True).values_list('skill_id', flat=True)
            )
            vacancy_optional_skills = set(
                vacancy.skill_requirements.filter(required=False).values_list('skill_id', flat=True)
            )
            vacancy_technologies = set(vacancy.technologies.values_list('id', flat=True))

            candidate_skills = set(candidate.skills.values_list('id', flat=True))
            candidate_technologies = set(candidate.technologies.values_list('id', flat=True))

            affinity_score, details = matcher.calculate_match_score(
                candidate_skills=candidate_skills,
                candidate_technologies=candidate_technologies,
                vacancy_required_skills=vacancy_required_skills,
                vacancy_optional_skills=vacancy_optional_skills,
                vacancy_technologies=vacancy_technologies
            )

            # Create application with calculated score
            application = Application.objects.create(
                **serializer.validated_data,
                affinity_score=affinity_score
            )

            result_serializer = self.get_serializer(application)

            return Response({
                'success': True,
                'message': 'Application created successfully',
                'data': result_serializer.data,
                'match_details': details
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
