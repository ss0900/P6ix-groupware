# backend/operation/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "operation"

router = DefaultRouter()
router.register("clients", views.ClientViewSet, basename="client")
router.register("opportunities", views.SalesOpportunityViewSet, basename="opportunity")
router.register("quote-templates", views.QuoteTemplateViewSet, basename="quote-template")
router.register("estimates", views.EstimateViewSet, basename="estimate")
router.register("contracts", views.ContractViewSet, basename="contract")
router.register("billing-schedules", views.BillingScheduleViewSet, basename="billing-schedule")
router.register("invoices", views.InvoiceViewSet, basename="invoice")
router.register("payments", views.PaymentViewSet, basename="payment")
router.register("dashboard", views.DashboardViewSet, basename="dashboard")

urlpatterns = [
    path("", include(router.urls)),
]
