from django.urls import path, include
from rest_framework import routers
from . import views
from django.shortcuts import redirect


def redirect_root(request):
    response = redirect('/admin')
    return response

urlpatterns = [
                  path('',redirect_root),
                  path('machines/', views.getMachines),
                  path('reasons/<str:machine_id>/', views.getMachineReasons),
              ]
