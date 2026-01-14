# backend/operation/admin.py
from django.contrib import admin
from .models import (
    Client, SalesOpportunity, QuoteTemplate, Estimate, EstimateItem,
    Contract, BillingSchedule, Invoice, Payment,
    SalesPipeline, SalesStage, CustomerContact, LeadActivity, LeadTask, LeadFile
)


# ==============================================
# 파이프라인/단계
# ==============================================

class SalesStageInline(admin.TabularInline):
    model = SalesStage
    extra = 1
    ordering = ["order"]


@admin.register(SalesPipeline)
class SalesPipelineAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "is_default", "stage_count", "created_by", "created_at"]
    list_filter = ["is_active", "is_default"]
    search_fields = ["name"]
    inlines = [SalesStageInline]
    
    def stage_count(self, obj):
        return obj.stages.count()
    stage_count.short_description = "단계 수"


@admin.register(SalesStage)
class SalesStageAdmin(admin.ModelAdmin):
    list_display = ["name", "pipeline", "order", "probability", "stage_type", "color"]
    list_filter = ["pipeline", "stage_type"]
    ordering = ["pipeline", "order"]


# ==============================================
# 고객 관리
# ==============================================

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "industry", "contact_name", "created_at"]
    list_filter = ["industry", "created_at"]
    search_fields = ["name", "contact_name", "business_number"]
    raw_id_fields = ["parent", "created_by"]


@admin.register(CustomerContact)
class CustomerContactAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "position", "department", "phone", "email", "is_primary"]
    list_filter = ["is_primary", "created_at"]
    search_fields = ["name", "company__name", "email"]
    raw_id_fields = ["company"]


# ==============================================
# 영업 기회
# ==============================================

class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0
    readonly_fields = ["activity_type", "title", "is_system", "created_by", "created_at"]
    can_delete = False


class LeadTaskInline(admin.TabularInline):
    model = LeadTask
    extra = 0


@admin.register(SalesOpportunity)
class SalesOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "client", "pipeline", "stage", "status", "priority", "expected_amount", "owner"]
    list_filter = ["status", "priority", "pipeline", "stage", "created_at"]
    search_fields = ["title", "client__name"]
    raw_id_fields = ["client", "owner", "pipeline", "stage", "customer_contact"]
    filter_horizontal = ["assignees"]
    inlines = [LeadTaskInline, LeadActivityInline]


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ["title", "lead", "activity_type", "is_system", "created_by", "created_at"]
    list_filter = ["activity_type", "is_system", "created_at"]
    search_fields = ["title", "lead__title"]
    raw_id_fields = ["lead", "created_by"]


@admin.register(LeadTask)
class LeadTaskAdmin(admin.ModelAdmin):
    list_display = ["title", "lead", "due_date", "assignee", "is_completed", "show_in_calendar"]
    list_filter = ["is_completed", "show_in_calendar", "due_date"]
    search_fields = ["title", "lead__title"]
    raw_id_fields = ["lead", "assignee", "created_by"]


@admin.register(LeadFile)
class LeadFileAdmin(admin.ModelAdmin):
    list_display = ["filename", "lead", "file_size", "uploaded_by", "uploaded_at"]
    list_filter = ["uploaded_at"]
    search_fields = ["filename", "lead__title"]
    raw_id_fields = ["lead", "uploaded_by"]


# ==============================================
# 견적/계약/청구
# ==============================================

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
