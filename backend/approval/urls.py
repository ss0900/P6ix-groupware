# backend/approval/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "approval"

router = DefaultRouter()
router.register("templates", views.DocumentTemplateViewSet, basename="template")
router.register("documents", views.DocumentViewSet, basename="document")
router.register("attachments", views.AttachmentViewSet, basename="attachment")

urlpatterns = [
    path("", include(router.urls)),
]
