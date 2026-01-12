# backend/operation/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "operation"

router = DefaultRouter()
router.register("clients", views.ClientViewSet, basename="client")
router.register("opportunities", views.SalesOpportunityViewSet, basename="opportunity")
router.register("estimates", views.EstimateViewSet, basename="estimate")
router.register("contracts", views.ContractViewSet, basename="contract")

urlpatterns = [
    path("", include(router.urls)),
]
