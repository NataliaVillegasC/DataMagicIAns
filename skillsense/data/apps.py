from django.apps import AppConfig


class DataConfig(AppConfig):
    """
    Configuration for the Data app managing O*NET data.
    
    This app handles all information about occupations, skills,
    and technologies from the O*NET dataset (Occupational Information Network).
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'data'
    verbose_name = 'Occupations and Skills Data'

