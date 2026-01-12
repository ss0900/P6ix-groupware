# backend/board/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "board"

router = DefaultRouter()
router.register("boards", views.BoardViewSet, basename="board")
router.register("posts", views.PostViewSet, basename="post")
router.register("comments", views.CommentViewSet, basename="comment")

urlpatterns = [
    path("", include(router.urls)),
]
