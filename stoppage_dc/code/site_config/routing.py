from channels.routing import ProtocolTypeRouter, URLRouter
import channels.staticfiles
from channels.auth import AuthMiddlewareStack
import fault_monitoring.routing


application = ProtocolTypeRouter({
        'websocket': AuthMiddlewareStack(
            URLRouter(
                fault_monitoring.routing.websocket_urlpatterns
            )
        ),
    })
