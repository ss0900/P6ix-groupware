# backend/resources/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "resources"

router = DefaultRouter()
router.register("folders", views.FolderViewSet, basename="folder")
router.register("files", views.ResourceViewSet, basename="resource")

urlpatterns = [
    path("", include(router.urls)),
]
