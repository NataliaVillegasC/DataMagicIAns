"""
Serializers for core app.

Provides serialization/deserialization for Vacancy, Application, and SkillRequirement models.
"""

from rest_framework import serializers
from django.db import transaction
from .models import Vacancy, Application, SkillRequirement, VacancyStatus, ApplicationStatus
from users.serializers import CompanySerializer
from data.models import Technology, Skill


class SkillRequirementSerializer(serializers.ModelSerializer):
    """Serializer for SkillRequirement with skill details."""

    skill_name = serializers.CharField(source='skill.element_name', read_only=True)
    skill_id_code = serializers.CharField(source='skill.element_id', read_only=True)
    occupation_name = serializers.CharField(source='occupation.title', read_only=True)

    class Meta:
        model = SkillRequirement
        fields = [
            'id',
            'skill',
            'skill_name',
            'skill_id_code',
            'occupation',
            'occupation_name',
            'required',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TechnologySerializer(serializers.ModelSerializer):
    """Lightweight serializer for Technology."""

    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Technology
        fields = ['id', 'example', 'category_name']
        read_only_fields = ['id']

    def get_category_name(self, obj):
        return obj.category.commodity_title if obj.category else None


class VacancyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vacancy list views."""

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
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_technology_count(self, obj):
        return obj.technologies.count()

    def get_skill_count(self, obj):
        return obj.skill_requirements.count()

    def get_application_count(self, obj):
        return obj.applications.count()


class VacancyDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for vacancy with all relationships."""

    company = CompanySerializer(read_only=True)
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
            'updated_at'
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
        help_text="List of technology IDs to associate with vacancy"
    )
    skill_requirement_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of skill requirement IDs to associate with vacancy"
    )

    class Meta:
        model = Vacancy
        fields = [
            'title',
            'description',
            'location',
            'status',
            'technology_ids',
            'skill_requirement_ids'
        ]

    def validate_status(self, value):
        """Validate status is valid."""
        if value not in dict(VacancyStatus.choices):
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(dict(VacancyStatus.choices).keys())}"
            )
        return value

    def validate_technology_ids(self, value):
        """Validate all technology IDs exist."""
        if value:
            existing_ids = set(Technology.objects.filter(id__in=value).values_list('id', flat=True))
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid technology IDs: {invalid_ids}"
                )
        return value

    def validate_skill_requirement_ids(self, value):
        """Validate all skill requirement IDs exist."""
        if value:
            existing_ids = set(SkillRequirement.objects.filter(id__in=value).values_list('id', flat=True))
            invalid_ids = set(value) - set(str(id) for id in existing_ids)
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid skill requirement IDs: {invalid_ids}"
                )
        return value

    @transaction.atomic
    def create(self, validated_data):
        """Create vacancy with company and relationships."""
        technology_ids = validated_data.pop('technology_ids', [])
        skill_requirement_ids = validated_data.pop('skill_requirement_ids', [])

        # Get company from request context
        company = self.context['request'].user.company
        validated_data['company'] = company

        # Create vacancy
        vacancy = Vacancy.objects.create(**validated_data)

        # Add technologies
        if technology_ids:
            technologies = Technology.objects.filter(id__in=technology_ids)
            vacancy.technologies.set(technologies)

        # Add skill requirements
        if skill_requirement_ids:
            skill_requirements = SkillRequirement.objects.filter(id__in=skill_requirement_ids)
            vacancy.skill_requirements.set(skill_requirements)

        return vacancy


class VacancyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating vacancies."""

    technology_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of technology IDs to associate with vacancy"
    )
    skill_requirement_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of skill requirement IDs to associate with vacancy"
    )

    class Meta:
        model = Vacancy
        fields = [
            'title',
            'description',
            'location',
            'status',
            'technology_ids',
            'skill_requirement_ids'
        ]

    def validate_status(self, value):
        """Validate status is valid."""
        if value and value not in dict(VacancyStatus.choices):
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(dict(VacancyStatus.choices).keys())}"
            )
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        """Update vacancy and relationships."""
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
            skill_requirements = SkillRequirement.objects.filter(id__in=skill_requirement_ids)
            instance.skill_requirements.set(skill_requirements)

        return instance


class ApplicationSerializer(serializers.ModelSerializer):
    """Serializer for Application model."""

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
            'updated_at'
        ]
        read_only_fields = ['id', 'affinity_score', 'created_at', 'updated_at']

    def validate_status(self, value):
        """Validate status is valid."""
        if value not in dict(ApplicationStatus.choices):
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(dict(ApplicationStatus.choices).keys())}"
            )
        return value
