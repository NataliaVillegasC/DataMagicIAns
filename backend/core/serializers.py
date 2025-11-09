"""
Serializers for core app.

Provides serialization for Vacancy, Application, and SkillRequirement models.
"""

from rest_framework import serializers
from django.db import transaction
from .models import Vacancy, Application, SkillRequirement
from data.models import Skill, Technology, OccupationAlternateTitle
from data.serializers import TechnologySerializer, SkillSerializer


class OccupationAlternateTitleSerializer(serializers.ModelSerializer):
    """Serializer for OccupationAlternateTitle (lightweight)."""
    
    class Meta:
        model = OccupationAlternateTitle
        fields = ['id', 'alternate_title', 'short_title']


class SkillRequirementSerializer(serializers.ModelSerializer):
    """Serializer for SkillRequirement with nested relationships."""
    
    skill = SkillSerializer(read_only=True)
    occupation = OccupationAlternateTitleSerializer(read_only=True)
    
    class Meta:
        model = SkillRequirement
        fields = [
            'id',
            'skill',
            'occupation',
            'required',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SkillRequirementCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SkillRequirement with get_or_create."""
    
    skill_id = serializers.IntegerField(write_only=True)
    occupation_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = SkillRequirement
        fields = ['id', 'skill_id', 'occupation_id', 'required']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        """Create or get existing skill requirement."""
        skill_id = validated_data.pop('skill_id')
        occupation_id = validated_data.pop('occupation_id', None)
        required = validated_data.get('required', True)
        
        try:
            skill = Skill.objects.get(id=skill_id)
        except Skill.DoesNotExist:
            raise serializers.ValidationError({'skill_id': 'Skill not found'})
        
        occupation = None
        if occupation_id:
            try:
                occupation = OccupationAlternateTitle.objects.get(id=occupation_id)
            except OccupationAlternateTitle.DoesNotExist:
                raise serializers.ValidationError({'occupation_id': 'Occupation not found'})
        
        # Get or create skill requirement
        skill_req, created = SkillRequirement.objects.get_or_create(
            skill=skill,
            occupation=occupation,
            defaults={'required': required}
        )
        
        # Update required flag if already exists
        if not created and skill_req.required != required:
            skill_req.required = required
            skill_req.save(update_fields=['required'])
        
        return skill_req


class VacancyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vacancy list."""
    
    company_name = serializers.CharField(source='company.name', read_only=True)
    technology_count = serializers.SerializerMethodField()
    skill_count = serializers.SerializerMethodField()
    application_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Vacancy
        fields = [
            'id',
            'title',
            'location',
            'company_name',
            'status',
            'technology_count',
            'skill_count',
            'application_count',
            'created_at',
        ]
    
    def get_technology_count(self, obj):
        return obj.technologies.count()
    
    def get_skill_count(self, obj):
        return obj.skill_requirements.count()
    
    def get_application_count(self, obj):
        return obj.applications.count()


class VacancyDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for vacancy with all relationships."""
    
    technologies = TechnologySerializer(many=True, read_only=True)
    skill_requirements = SkillRequirementSerializer(many=True, read_only=True)
    application_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Vacancy
        fields = [
            'id',
            'company',
            'title',
            'description',
            'location',
            'status',
            'technologies',
            'skill_requirements',
            'application_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
    
    def get_application_count(self, obj):
        return obj.applications.count()


class VacancyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating vacancies."""
    
    technology_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    skill_requirement_ids = serializers.ListField(
        child=serializers.CharField(),  # UUID
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Vacancy
        fields = [
            'title',
            'description',
            'location',
            'status',
            'technology_ids',
            'skill_requirement_ids',
        ]
    
    @transaction.atomic
    def create(self, validated_data):
        """Create vacancy with technologies and skill requirements."""
        technology_ids = validated_data.pop('technology_ids', [])
        skill_requirement_ids = validated_data.pop('skill_requirement_ids', [])
        
        # Create vacancy
        vacancy = Vacancy.objects.create(
            company=self.context['request'].user.company,
            **validated_data
        )
        
        # Add technologies
        if technology_ids:
            technologies = Technology.objects.filter(id__in=technology_ids)
            vacancy.technologies.set(technologies)
        
        # Add skill requirements
        if skill_requirement_ids:
            skill_reqs = SkillRequirement.objects.filter(id__in=skill_requirement_ids)
            vacancy.skill_requirements.set(skill_reqs)
        
        return vacancy


class VacancyUpdateSerializer(VacancyCreateSerializer):
    """Serializer for updating vacancies."""
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update vacancy."""
        technology_ids = validated_data.pop('technology_ids', None)
        skill_requirement_ids = validated_data.pop('skill_requirement_ids', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update technologies if provided
        if technology_ids is not None:
            technologies = Technology.objects.filter(id__in=technology_ids)
            instance.technologies.set(technologies)
        
        # Update skill requirements if provided
        if skill_requirement_ids is not None:
            skill_reqs = SkillRequirement.objects.filter(id__in=skill_requirement_ids)
            instance.skill_requirements.set(skill_reqs)
        
        return instance


class ApplicationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for application list."""
    
    vacancy_title = serializers.CharField(source='vacancy.title', read_only=True)
    candidate_name = serializers.CharField(source='candidate.full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id',
            'vacancy',
            'vacancy_title',
            'candidate',
            'candidate_name',
            'candidate_email',
            'status',
            'affinity_score',
            'created_at',
        ]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for application."""
    
    vacancy_title = serializers.CharField(source='vacancy.title', read_only=True)
    candidate_name = serializers.CharField(source='candidate.full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id',
            'vacancy',
            'vacancy_title',
            'candidate',
            'candidate_name',
            'candidate_email',
            'status',
            'affinity_score',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'affinity_score', 'created_at', 'updated_at']


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications."""
    
    class Meta:
        model = Application
        fields = ['vacancy', 'candidate', 'status']
    
    def create(self, validated_data):
        """Create application and calculate affinity score."""
        vacancy = validated_data['vacancy']
        candidate = validated_data['candidate']
        
        # Calculate affinity score using matching service
        from .matching_service import MatchingService
        matcher = MatchingService()
        match_result = matcher.calculate_match(vacancy, candidate)
        
        # Create application with calculated score
        application = Application.objects.create(
            vacancy=vacancy,
            candidate=candidate,
            status=validated_data.get('status', 'PENDING'),
            affinity_score=match_result['total_score']
        )
        
        return application
