"""
Base models for the project - Common patterns and mixins
"""
from uuid import uuid4
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class BaseModel(models.Model):
    """
    Base model with UUID primary key
    All models should inherit from this
    """
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

    class Meta:
        abstract = True


class TimestampModel(BaseModel):
    """
    Model with automatic timestamp tracking
    Adds created_at and updated_at fields
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created At"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated At"))

    class Meta:
        abstract = True


class SoftDeleteModel(BaseModel):
    """
    Model with soft delete functionality
    Records are marked as deleted instead of being removed
    """
    is_deleted = models.BooleanField(default=False, verbose_name=_("Is Deleted"))
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Deleted At"))

    class Meta:
        abstract = True
    
    def soft_delete(self):
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
    
    def restore(self):
        """Restore soft-deleted record"""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])


class ActiveModel(BaseModel):
    """
    Model with active status field
    Useful for toggleable records
    """
    is_active = models.BooleanField(default=True, verbose_name=_("Is Active"))

    class Meta:
        abstract = True

class UserRegistratedBy(TimestampModel):
    """
    Model with user registration tracking functionality.
    Tracks which user registered/created the record.
    """
    registrated_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='registrated_by_users')
    
    class Meta:
        abstract = True

