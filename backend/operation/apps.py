# backend/operation/apps.py
from django.apps import AppConfig


class OperationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'operation'
    verbose_name = '영업관리'
