from django.apps import AppConfig


class CoreConfig(AppConfig):
    """
    Configuration for the Core app.
    
    This app handles core business logic including skill requirements,
    vacancies, and applications.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core Business Logic'
