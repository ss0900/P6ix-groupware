# backend/meeting/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "meeting"

router = DefaultRouter()
router.register("rooms", views.MeetingRoomViewSet, basename="room")
router.register("schedules", views.ScheduleViewSet, basename="schedule")

urlpatterns = [
    path("", include(router.urls)),
]
