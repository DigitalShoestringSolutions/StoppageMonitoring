from django.urls import path, re_path
from django.shortcuts import redirect

from . import views

# def redirect_root(request):
#     response = redirect('locations')
#     return response

urlpatterns = [
    path('api/machines', views.get_machines),
    path('api/reasons/<str:machine_id>', views.get_reasons),
    # path('', views.render_app),
    re_path(r'^.*', views.render_app, name='render'),
]
