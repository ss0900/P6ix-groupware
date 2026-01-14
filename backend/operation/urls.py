# backend/operation/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "operation"

router = DefaultRouter()

# 기존 ViewSets
router.register("clients", views.ClientViewSet, basename="client")
router.register("opportunities", views.SalesOpportunityViewSet, basename="opportunity")
router.register("quote-templates", views.QuoteTemplateViewSet, basename="quote-template")
router.register("estimates", views.EstimateViewSet, basename="estimate")
router.register("contracts", views.ContractViewSet, basename="contract")
router.register("billing-schedules", views.BillingScheduleViewSet, basename="billing-schedule")
router.register("invoices", views.InvoiceViewSet, basename="invoice")
router.register("payments", views.PaymentViewSet, basename="payment")
router.register("dashboard", views.DashboardViewSet, basename="dashboard")

# 신규 ViewSets
router.register("pipelines", views.SalesPipelineViewSet, basename="pipeline")
router.register("stages", views.SalesStageViewSet, basename="stage")
router.register("contacts", views.CustomerContactViewSet, basename="contact")
router.register("calendar", views.CalendarViewSet, basename="calendar")

urlpatterns = [
    path("", include(router.urls)),
]
