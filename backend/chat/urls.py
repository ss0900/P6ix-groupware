# backend/chat/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "chat"

router = DefaultRouter()
router.register("conversations", views.ConversationViewSet, basename="conversation")
router.register("messages", views.MessageViewSet, basename="message")
router.register("docs", views.DocListView, basename="docs")
router.register("users", views.ProjectChatUserListView, basename="chat-users")
router.register("notifications", views.NotificationViewSet, basename="notification")
router.register("help", views.HelpQuestionViewSet, basename="help")

urlpatterns = [
    path("", include(router.urls)),
]
