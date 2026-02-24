# backend/meeting/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "meeting"

router = DefaultRouter()
router.register("calendars", views.CalendarViewSet, basename="calendar")
router.register("schedules", views.ScheduleViewSet, basename="schedule")
router.register("resources", views.ResourceViewSet, basename="resource")
router.register("reservations", views.ResourceReservationViewSet, basename="reservation")

urlpatterns = [
    path("", include(router.urls)),
]
