# backend/project/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, TaskViewSet,
    TaskCommentViewSet, TaskAttachmentViewSet,
    ActivityLogViewSet,
    TimesheetEntryViewSet, WorkDiaryEntryViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'comments', TaskCommentViewSet, basename='task-comment')
router.register(r'attachments', TaskAttachmentViewSet, basename='task-attachment')
router.register(r'activities', ActivityLogViewSet, basename='activity-log')
router.register(r'timesheets', TimesheetEntryViewSet, basename='timesheet')
router.register(r'diaries', WorkDiaryEntryViewSet, basename='work-diary')

urlpatterns = [
    path('', include(router.urls)),
]
