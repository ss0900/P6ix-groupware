# backend/board/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, PostViewSet

app_name = "board"

router = DefaultRouter()
router.register(r'boards', BoardViewSet, basename='board')
router.register(r'posts', PostViewSet, basename='post')

urlpatterns = [
    path('', include(router.urls)),
]
