# backend/meeting/apps.py
from django.apps import AppConfig


class MeetingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'meeting'
    verbose_name = '회의/일정'
