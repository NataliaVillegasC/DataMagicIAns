"""
Serializers for users app.

Provides serialization/deserialization for User, Company, Candidate, and CVFile models
with comprehensive validation and nested relationships.
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from .models import User, Company, Candidate, CVFile


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    
    class Meta:
        model = Company
        fields = [
            'id', 
            'name', 
            'email', 
            'phone', 
            'address', 
            'website',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration with company creation."""
    
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    company_name = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'password',
            'password_confirm',
            'company_name',
            'first_name',
            'last_name',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }
    
    def validate(self, attrs):
        """Validate password confirmation and email uniqueness."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Las contraseñas no coinciden."
            })
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                "email": "Ya existe un usuario con este email."
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Create user and associated company."""
        # Remove extra fields
        validated_data.pop('password_confirm')
        company_name = validated_data.pop('company_name')
        
        # Create or get company
        company, created = Company.objects.get_or_create(
            name=company_name,
            defaults={'email': validated_data.get('email')}
        )
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            company=company,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with company details."""
    
    company = CompanySerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'company',
            'is_verified',
            'has_mfa',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'is_verified', 'has_mfa']


class CVFileSerializer(serializers.ModelSerializer):
    """Serializer for CVFile model."""
    
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CVFile
        fields = [
            'id',
            'file',
            'file_url',
            'hash',
            'extraction_result',
            'metadata',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'hash', 'extraction_result', 'metadata', 'created_at', 'updated_at']
    
    def get_file_url(self, obj):
        """Get signed URL for CV file."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class CandidateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for candidate list views."""
    
    registrated_by = serializers.StringRelatedField()
    has_cv = serializers.SerializerMethodField()
    
    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'phone',
            'location',
            'has_cv',
            'registrated_by',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_has_cv(self, obj):
        """Check if candidate has CV file."""
        return bool(obj.cv_file_id)


class SkillSerializer(serializers.Serializer):
    """Lightweight serializer for Skill."""
    id = serializers.IntegerField()
    element_id = serializers.CharField()
    element_name = serializers.CharField()


class TechnologySerializer(serializers.Serializer):
    """Lightweight serializer for Technology."""
    id = serializers.IntegerField()
    example = serializers.CharField()
    category = serializers.SerializerMethodField()
    
    def get_category(self, obj):
        if obj.category:
            return obj.category.commodity_title
        return None


class CandidateDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for candidate with all relationships."""
    
    cv_file = CVFileSerializer(read_only=True)
    registrated_by = UserSerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    technologies = TechnologySerializer(many=True, read_only=True)
    
    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'phone',
            'location',
            'linkedin_url',
            'github_url',
            'portfolio_url',
            'other_url',
            'cv_file',
            'supervised_data',
            'skills',
            'technologies',
            'registrated_by',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'cv_file', 'registrated_by', 'created_at', 'updated_at']


class CandidateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating candidates with supervised data."""

    cv_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        write_only=True,
        help_text="UUID of previously uploaded CV file"
    )

    class Meta:
        model = Candidate
        fields = [
            'full_name',
            'email',
            'phone',
            'location',
            'linkedin_url',
            'github_url',
            'portfolio_url',
            'other_url',
            'supervised_data',
            'cv_file_id',
        ]

    def validate_email(self, value):
        """Validate email format and uniqueness within company."""
        user = self.context['request'].user

        # Check if email already exists for this company
        if Candidate.objects.filter(
            email=value,
            registrated_by__company=user.company
        ).exists():
            raise serializers.ValidationError(
                "Ya existe un candidato con este email en tu empresa."
            )

        return value

    def validate_cv_file_id(self, value):
        """Validate cv_file_id exists and doesn't have a candidate."""
        if value:
            try:
                cv_file = CVFile.objects.get(id=value)

                # Check if CV file already has a candidate
                if hasattr(cv_file, 'candidate') and cv_file.candidate is not None:
                    raise serializers.ValidationError(
                        "Este CV ya está asociado a otro candidato."
                    )
            except CVFile.DoesNotExist:
                raise serializers.ValidationError(
                    "CV file no encontrado."
                )

        return value

    def validate_supervised_data(self, value):
        """Validate supervised_data JSON structure."""
        if value is not None:
            if not isinstance(value, dict):
                raise serializers.ValidationError(
                    "supervised_data debe ser un objeto JSON válido."
                )

            # Optional: validate required fields in supervised_data
            # required_fields = ['full_name', 'email']
            # for field in required_fields:
            #     if field not in value:
            #         raise serializers.ValidationError(
            #             f"El campo '{field}' es requerido en supervised_data."
            #         )

        return value

    @transaction.atomic
    def create(self, validated_data):
        """Create candidate with current user as registrator and associate CV file."""
        user = self.context['request'].user
        cv_file_id = validated_data.pop('cv_file_id', None)

        # Set registrator
        validated_data['registrated_by'] = user

        # Associate CV file if provided
        if cv_file_id:
            cv_file = CVFile.objects.get(id=cv_file_id)
            validated_data['cv_file'] = cv_file

        candidate = super().create(validated_data)

        return candidate


class CandidateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating candidate information."""
    
    class Meta:
        model = Candidate
        fields = [
            'full_name',
            'email',
            'phone',
            'location',
            'linkedin_url',
            'github_url',
            'portfolio_url',
            'other_url',
            'supervised_data',
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness within company (excluding current candidate)."""
        user = self.context['request'].user
        candidate = self.instance
        
        # Check if email already exists for another candidate in this company
        if Candidate.objects.filter(
            email=value,
            registrated_by__company=user.company
        ).exclude(id=candidate.id).exists():
            raise serializers.ValidationError(
                "Ya existe otro candidato con este email en tu empresa."
            )
        
        return value


class CVUploadSerializer(serializers.Serializer):
    """Serializer for CV file upload with extraction."""
    
    cv_file = serializers.FileField(
        required=True,
        help_text="CV file (PDF, DOC, DOCX)"
    )
    
    def validate_cv_file(self, value):
        """Validate CV file type and size."""
        # Validate file extension
        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_extension = value.name.lower().split('.')[-1]
        
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Tipo de archivo no permitido. Solo se aceptan: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"El archivo es muy grande. Tamaño máximo: 10MB"
            )
        
        return value

