# backend/timeline/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimelineEventViewSet

router = DefaultRouter()
router.register(r"events", TimelineEventViewSet, basename="timeline-event")

urlpatterns = [
    path("", include(router.urls)),
]
