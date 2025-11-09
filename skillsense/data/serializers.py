"""
Serializers for data app.

Provides API serialization for Technology, Skill, and Occupation models.
"""

from rest_framework import serializers
from .models import Technology, TechnologyCategory, Skill, OccupationAlternateTitle


class TechnologyCategorySerializer(serializers.ModelSerializer):
    """Serializer for TechnologyCategory model."""
    
    class Meta:
        model = TechnologyCategory
        fields = ['id', 'commodity_code', 'commodity_title']


class TechnologySerializer(serializers.ModelSerializer):
    """Serializer for Technology model."""
    
    category_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Technology
        fields = [
            'id',
            'example',
            'category',
            'category_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_category_name(self, obj):
        """Get category title."""
        return obj.category.commodity_title if obj.category else None


class SkillSerializer(serializers.ModelSerializer):
    """Serializer for Skill model."""
    
    class Meta:
        model = Skill
        fields = [
            'id',
            'element_id',
            'element_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OccupationAlternateTitleSerializer(serializers.ModelSerializer):
    """Serializer for OccupationAlternateTitle model."""
    
    occupation_title = serializers.CharField(source='occupation.title', read_only=True)
    
    class Meta:
        model = OccupationAlternateTitle
        fields = [
            'id',
            'alternate_title',
            'short_title',
            'occupation',
            'occupation_title',
        ]
        read_only_fields = ['id', 'occupation_title']
