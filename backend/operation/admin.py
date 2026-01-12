# backend/operation/admin.py
from django.contrib import admin
from .models import Client, SalesOpportunity, Estimate, EstimateItem, Contract


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "industry", "contact_name", "phone", "email", "created_at"]
    list_filter = ["industry"]
    search_fields = ["name", "contact_name", "email"]


class EstimateItemInline(admin.TabularInline):
    model = EstimateItem
    extra = 1


@admin.register(SalesOpportunity)
class SalesOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "client", "status", "priority", "expected_amount", "probability", "owner", "expected_close_date"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "client__name"]
    raw_id_fields = ["client", "owner"]


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ["estimate_number", "title", "opportunity", "status", "total", "valid_until", "created_at"]
    list_filter = ["status"]
    search_fields = ["estimate_number", "title"]
    raw_id_fields = ["opportunity", "created_by"]
    inlines = [EstimateItemInline]


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ["contract_number", "title", "client", "status", "amount", "start_date", "end_date"]
    list_filter = ["status"]
    search_fields = ["contract_number", "title", "client__name"]
    raw_id_fields = ["client", "opportunity", "created_by"]
