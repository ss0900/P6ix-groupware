# backend/contact/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MessageViewSet, CommentViewSet

router = DefaultRouter()
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("", include(router.urls)),
    # 댓글 엔드포인트 (nested router 대신 직접 정의)
    path("messages/<int:message_pk>/comments/", CommentViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name="message-comments-list"),
    path("messages/<int:message_pk>/comments/<int:pk>/", CommentViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name="message-comments-detail"),
]
