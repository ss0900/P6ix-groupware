# backend/operation/admin.py
from django.contrib import admin
from .models import (
    Client, SalesOpportunity, QuoteTemplate, Estimate, EstimateItem,
    Contract, BillingSchedule, Invoice, Payment
)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "industry", "contact_name", "created_at"]
    list_filter = ["industry", "created_at"]
    search_fields = ["name", "contact_name", "business_number"]
    raw_id_fields = ["parent", "created_by"]


@admin.register(SalesOpportunity)
class SalesOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "client", "status", "priority", "expected_amount", "probability", "owner"]
    list_filter = ["status", "priority", "created_at"]
    search_fields = ["title", "client__name"]
    raw_id_fields = ["client", "owner"]


@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "is_default", "created_by", "created_at"]
    list_filter = ["is_default", "created_at"]
    search_fields = ["name"]


class EstimateItemInline(admin.TabularInline):
    model = EstimateItem
    extra = 1


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ["estimate_number", "title", "opportunity", "version", "is_final", "status", "total"]
    list_filter = ["status", "is_final", "created_at"]
    search_fields = ["estimate_number", "title", "opportunity__title"]
    raw_id_fields = ["opportunity", "template", "parent_estimate", "created_by"]
    inlines = [EstimateItemInline]


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ["contract_number", "title", "client", "status", "contract_type", "billing_cycle", "amount"]
    list_filter = ["status", "contract_type", "billing_cycle", "created_at"]
    search_fields = ["contract_number", "title", "client__name"]
    raw_id_fields = ["client", "opportunity", "created_by"]


@admin.register(BillingSchedule)
class BillingScheduleAdmin(admin.ModelAdmin):
    list_display = ["contract", "scheduled_date", "amount", "status", "milestone_name"]
    list_filter = ["status", "scheduled_date"]
    raw_id_fields = ["contract"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "contract", "issue_date", "due_date", "total", "status"]
    list_filter = ["status", "issue_date", "due_date"]
    search_fields = ["invoice_number", "contract__contract_number", "contract__client__name"]
    raw_id_fields = ["contract", "billing_schedule", "created_by"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice", "payment_date", "amount", "payment_method", "created_by"]
    list_filter = ["payment_method", "payment_date"]
    search_fields = ["invoice__invoice_number", "reference"]
    raw_id_fields = ["invoice", "created_by"]
