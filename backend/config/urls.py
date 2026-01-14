"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)
from core.views.auth_view import UserMeView

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # JWT 인증
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    
    # 사용자 정보
    path("api/users/me/", UserMeView.as_view(), name="user_me"),

    # 모듈별
    path("api/core/", include("core.urls")),
    path("api/approval/", include("approval.urls")),
    path("api/board/", include("board.urls")),
    path("api/meeting/", include("meeting.urls")),
    path("api/resources/", include("resources.urls")),

    path("api/chat/", include("chat.urls")),
    path("api/timeline/", include("timeline.urls")),
    path("api/contact/", include("contact.urls")),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)