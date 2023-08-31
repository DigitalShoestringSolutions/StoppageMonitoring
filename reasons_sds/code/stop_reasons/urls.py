from django.urls import path, include
from rest_framework import routers
from . import views
from django.shortcuts import redirect


urlpatterns = [
                  path('machines/', views.getMachines),
                  path('reasons/<str:machine_id>/', views.getMachineReasons),
              ]
