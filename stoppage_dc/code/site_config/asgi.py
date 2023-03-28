import os
from channels.routing import get_default_application
import django
from channels.layers import get_channel_layer
import shoestring_wrapper.wrapper

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'site_config.settings')
django.setup()
application = get_default_application()

shoestring_wrapper.wrapper.Wrapper.start({'channel_layer':get_channel_layer()})

