# backend/resources/apps.py
from django.apps import AppConfig


class ResourcesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'resources'
    verbose_name = '자료실'
