"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# get_asgi_application()을 먼저 호출하여 장고 설정을 초기화합니다.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
try:
    from chat.middleware import JWTAuthMiddlewareStack
    import chat.routing
    _ws_app = JWTAuthMiddlewareStack(URLRouter(chat.routing.websocket_urlpatterns))
except Exception:
    # chat 앱/라우팅이 아직 없으면 websocket을 비활성화(HTTP는 정상 동작)
    _ws_app = None

application = ProtocolTypeRouter(
    {"http": django_asgi_app, **({"websocket": _ws_app} if _ws_app else {})}
)