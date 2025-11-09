"""
Views for users app.

Provides API endpoints for authentication, user management, and candidate CRUD operations.
"""

import base64
import hashlib
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404

from .models import User, Company, Candidate, CVFile
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CompanySerializer,
    CandidateListSerializer,
    CandidateDetailSerializer,
    CandidateCreateSerializer,
    CandidateUpdateSerializer,
    CVUploadSerializer,
)
from core.cv_extractor import DocumentExtractor, CVConfig
from .skill_mapper import get_skill_mapper


logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """
    API endpoint for user registration.
    
    POST /api/auth/register/
    - Creates new user and company
    - Returns JWT tokens
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Register new user with company."""
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'success': True,
                'message': 'Usuario registrado exitosamente',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    API endpoint for user login.
    
    POST /api/auth/login/
    - Authenticates user with email/password
    - Returns JWT tokens
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Login user with email and password."""
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'success': False,
                'message': 'Email y contraseña son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Credenciales inválidas'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.check_password(password):
            return Response({
                'success': False,
                'message': 'Credenciales inválidas'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'Usuario inactivo'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'message': 'Login exitoso',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    API endpoint to get current authenticated user.
    
    GET /api/auth/me/
    - Returns current user information
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current authenticated user."""
        user = request.user
        serializer = UserSerializer(user)
        
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)


class IsCompanyMember(permissions.BasePermission):
    """
    Permission to check if user belongs to the same company as the object.
    """
    
    def has_object_permission(self, request, view, obj):
        """Check if user's company matches object's company."""
        if hasattr(obj, 'registrated_by'):
            return obj.registrated_by.company == request.user.company
        return False


class CandidateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Candidate CRUD operations.
    
    Endpoints:
    - GET /api/candidates/ - List all candidates (filtered by company)
    - POST /api/candidates/ - Create new candidate
    - GET /api/candidates/{id}/ - Retrieve candidate details
    - PUT /api/candidates/{id}/ - Update candidate
    - PATCH /api/candidates/{id}/ - Partial update candidate
    - DELETE /api/candidates/{id}/ - Delete candidate
    - POST /api/candidates/{id}/upload_cv/ - Upload and extract CV
    """
    
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    
    def get_queryset(self):
        """Filter candidates by user's company."""
        user = self.request.user
        return Candidate.objects.filter(
            registrated_by__company=user.company
        ).select_related(
            'cv_file',
            'registrated_by',
            'registrated_by__company'
        ).prefetch_related(
            'skills',
            'technologies'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CandidateListSerializer
        elif self.action == 'create':
            return CandidateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CandidateUpdateSerializer
        elif self.action == 'upload_cv':
            return CVUploadSerializer
        return CandidateDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new candidate with supervised data and map skills."""
        serializer = self.get_serializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            candidate = serializer.save()

            # Map skills and technologies if supervised_data is provided
            mapping_stats = None
            if 'supervised_data' in request.data and request.data['supervised_data']:
                supervised_data = request.data['supervised_data']

                # Extract skills from supervised_data
                generic_skills = []
                keywords = []

                if isinstance(supervised_data, dict):
                    generic_skills = supervised_data.get('generic_skills', [])
                    keywords = supervised_data.get('keywords', [])

                    # Try to get from 'skills' field if not in standard fields
                    if not generic_skills and not keywords:
                        skills_field = supervised_data.get('skills', [])
                        if isinstance(skills_field, list):
                            generic_skills = skills_field

                # Also try to get from CV extraction if exists
                if candidate.cv_file and candidate.cv_file.extraction_result:
                    extraction = candidate.cv_file.extraction_result
                    if extraction.get('documents'):
                        first_doc = extraction['documents'][0]
                        extracted_data = first_doc.get('data', {})

                        # Use CV data as fallback or complement
                        if not generic_skills:
                            generic_skills = extracted_data.get('generic_skills', [])
                        if not keywords:
                            keywords = extracted_data.get('keywords', [])

                # Perform mapping if we have skills
                if generic_skills or keywords:
                    logger.info(f"Mapping skills and technologies for new candidate {candidate.id}")

                    mapper = get_skill_mapper()
                    matched_skills, matched_technologies = mapper.map_skills_and_technologies(
                        generic_skills=generic_skills,
                        keywords=keywords
                    )

                    # Assign to candidate
                    if matched_skills:
                        candidate.skills.set(matched_skills)
                        logger.info(f"Assigned {len(matched_skills)} skills to candidate {candidate.id}")

                    if matched_technologies:
                        candidate.technologies.set(matched_technologies)
                        logger.info(f"Assigned {len(matched_technologies)} technologies to candidate {candidate.id}")

                    # Get mapping statistics
                    mapping_stats = mapper.get_matching_statistics(
                        generic_skills=generic_skills,
                        keywords=keywords
                    )

            # Return detailed response
            detail_serializer = CandidateDetailSerializer(candidate, context={'request': request})

            response_data = {
                'success': True,
                'message': 'Candidato creado exitosamente',
                'data': detail_serializer.data
            }

            # Include mapping statistics if available
            if mapping_stats:
                response_data['mapping_statistics'] = mapping_stats

            return Response(response_data, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve candidate details."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        """Update candidate information and map skills if supervised_data is provided."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, 
            data=request.data, 
            partial=partial,
            context={'request': request}
        )
        
        if serializer.is_valid():
            candidate = serializer.save()
            
            # Map skills and technologies if supervised_data is being updated
            mapping_stats = None
            if 'supervised_data' in request.data and request.data['supervised_data']:
                supervised_data = request.data['supervised_data']
                
                # Extract skills from supervised_data
                # Puede venir en diferentes formatos, intentamos extraer lo que podamos
                generic_skills = []
                keywords = []
                
                # Si supervised_data tiene los campos de Gemini
                if isinstance(supervised_data, dict):
                    generic_skills = supervised_data.get('generic_skills', [])
                    keywords = supervised_data.get('keywords', [])
                    
                    # Si no están directamente, buscar en otros posibles campos
                    if not generic_skills and not keywords:
                        # Intentar extraer de 'skills' si existe
                        skills_field = supervised_data.get('skills', [])
                        if isinstance(skills_field, list):
                            generic_skills = skills_field
                
                # También intentar obtener del CV extraído si existe
                if candidate.cv_file and candidate.cv_file.extraction_result:
                    extraction = candidate.cv_file.extraction_result
                    if extraction.get('documents'):
                        first_doc = extraction['documents'][0]
                        extracted_data = first_doc.get('data', {})
                        
                        # Usar los datos del CV como fallback o complemento
                        if not generic_skills:
                            generic_skills = extracted_data.get('generic_skills', [])
                        if not keywords:
                            keywords = extracted_data.get('keywords', [])
                
                # Realizar mapeo si tenemos skills
                if generic_skills or keywords:
                    logger.info(f"Mapping skills and technologies for candidate {candidate.id} after supervised_data update")
                    
                    mapper = get_skill_mapper()
                    matched_skills, matched_technologies = mapper.map_skills_and_technologies(
                        generic_skills=generic_skills,
                        keywords=keywords
                    )
                    
                    # Assign to candidate
                    if matched_skills:
                        candidate.skills.clear()
                        candidate.skills.add(*matched_skills)
                        logger.info(f"Assigned {len(matched_skills)} skills to candidate {candidate.id}")
                    
                    if matched_technologies:
                        candidate.technologies.clear()
                        candidate.technologies.add(*matched_technologies)
                        logger.info(f"Assigned {len(matched_technologies)} technologies to candidate {candidate.id}")
                    
                    # Get mapping statistics
                    mapping_stats = mapper.get_matching_statistics(
                        generic_skills=generic_skills,
                        keywords=keywords
                    )
            
            # Return detailed response
            detail_serializer = CandidateDetailSerializer(candidate, context={'request': request})
            
            response_data = {
                'success': True,
                'message': 'Candidato actualizado exitosamente',
                'data': detail_serializer.data
            }
            
            # Include mapping statistics if available
            if mapping_stats:
                response_data['mapping_statistics'] = mapping_stats
            
            return Response(response_data)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete candidate."""
        instance = self.get_object()
        
        # Delete CV file from storage if exists
        if instance.cv_file and instance.cv_file.file:
            try:
                instance.cv_file.file.delete(save=False)
            except Exception as e:
                logger.warning(f"Error deleting CV file: {str(e)}")
        
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Candidato eliminado exitosamente'
        }, status=status.HTTP_204_NO_CONTENT)
    
    def list(self, request, *args, **kwargs):
        """List candidates with pagination."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Optional search filter
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                full_name__icontains=search
            ) | queryset.filter(
                email__icontains=search
            )
        
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
    
    @action(detail=True, methods=['post'], url_path='upload-cv')
    @transaction.atomic
    def upload_cv(self, request, pk=None):
        """
        Upload CV file and extract data using Gemini AI.
        
        POST /api/candidates/{id}/upload-cv/
        
        Request:
        - cv_file: File (PDF, DOC, DOCX)
        
        Response:
        - extraction_result: JSON data extracted by Gemini
        - candidate: Updated candidate data
        
        The extraction result is saved in cv_file.extraction_result and
        returned to the frontend for auto-fill. The HR person can then
        review/correct the data before saving it in supervised_data.
        """
        candidate = self.get_object()
        serializer = CVUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cv_file = serializer.validated_data['cv_file']
        
        try:
            # Read file content
            file_content = cv_file.read()
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Convert to base64 for extraction
            base64_content = base64.b64encode(file_content).decode('utf-8')
            
            logger.info(f"Starting CV extraction for candidate {candidate.id}")
            
            # Extract data using Gemini
            extractor = DocumentExtractor(CVConfig())
            extraction_result = extractor.extract_document_info(base64_content)
            
            logger.info(f"CV extraction completed for candidate {candidate.id}")
            
            # Create or update CVFile
            if candidate.cv_file:
                # Update existing CV file
                cv_file_obj = candidate.cv_file
                
                # Delete old file from storage
                if cv_file_obj.file:
                    cv_file_obj.file.delete(save=False)
            else:
                # Create new CV file
                cv_file_obj = CVFile()
            
            # Save file to storage
            cv_file_obj.file.save(
                cv_file.name,
                ContentFile(file_content),
                save=False
            )
            
            # Save extraction result and metadata
            cv_file_obj.hash = file_hash
            cv_file_obj.extraction_result = extraction_result
            cv_file_obj.metadata = {
                'original_filename': cv_file.name,
                'file_size': cv_file.size,
                'content_type': cv_file.content_type,
            }
            cv_file_obj.save()
            
            # Link CV file to candidate if not already linked
            if not candidate.cv_file:
                candidate.cv_file = cv_file_obj
                candidate.save(update_fields=['cv_file'])
            
            # Return extraction result for frontend auto-fill
            # NO mapeamos aquí - el mapeo se hace cuando HR guarda supervised_data
            return Response({
                'success': True,
                'message': 'CV procesado exitosamente. Revisa los datos extraídos y guárdalos para mapear skills.',
                'extraction_result': extraction_result,
                'candidate': CandidateDetailSerializer(
                    candidate, 
                    context={'request': request}
                ).data
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error processing CV for candidate {candidate.id}: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error al procesar el CV: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CVUploadView(APIView):
    """
    API endpoint for uploading CV without candidate.

    POST /api/cv/upload/
    - Uploads CV file
    - Extracts data using Gemini AI
    - Returns cv_file_id and extracted data for frontend auto-fill
    - HR can then create candidate with this cv_file_id
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """Upload CV and extract data."""
        serializer = CVUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        cv_file = serializer.validated_data['cv_file']

        try:
            # Read file content
            file_content = cv_file.read()

            # Calculate file hash
            file_hash = hashlib.sha256(file_content).hexdigest()

            # Convert to base64 for extraction
            base64_content = base64.b64encode(file_content).decode('utf-8')

            logger.info(f"Starting CV extraction for new upload by user {request.user.id}")

            # Extract data using Gemini
            extractor = DocumentExtractor(CVConfig())
            extraction_result = extractor.extract_document_info(base64_content)

            logger.info(f"CV extraction completed successfully")

            # Create new CVFile (without candidate)
            cv_file_obj = CVFile()

            # Save file to storage
            cv_file_obj.file.save(
                cv_file.name,
                ContentFile(file_content),
                save=False
            )

            # Save extraction result and metadata
            cv_file_obj.hash = file_hash
            cv_file_obj.extraction_result = extraction_result
            cv_file_obj.metadata = {
                'original_filename': cv_file.name,
                'file_size': cv_file.size,
                'content_type': cv_file.content_type,
                'uploaded_by': str(request.user.id),  # Convert UUID to string
            }
            cv_file_obj.save()

            logger.info(f"CV file created with ID: {cv_file_obj.id}")

            # Return extraction result for frontend auto-fill
            return Response({
                'success': True,
                'message': 'CV procesado exitosamente. Revisa los datos extraídos antes de crear el candidato.',
                'cv_file_id': cv_file_obj.id,
                'extraction_result': extraction_result,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error processing CV upload: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error al procesar el CV: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Company read-only operations.

    Endpoints:
    - GET /api/companies/ - List companies
    - GET /api/companies/{id}/ - Retrieve company details
    """

    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter to user's company only."""
        return Company.objects.filter(id=self.request.user.company.id)
