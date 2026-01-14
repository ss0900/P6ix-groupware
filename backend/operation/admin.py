# backend/operation/admin.py
"""
영업관리(Operation) 모듈 - Admin 설정
"""
from django.contrib import admin
from .models import (
    CustomerCompany, CustomerContact,
    SalesPipeline, SalesStage,
    SalesLead, LeadActivity, LeadTask, LeadFile,
    Quote, QuoteItem, QuoteTemplate
)


# ============================================================
# 고객 관리
# ============================================================
class CustomerContactInline(admin.TabularInline):
    model = CustomerContact
    extra = 1


@admin.register(CustomerCompany)
class CustomerCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'business_number', 'industry', 'phone', 'created_at']
    list_filter = ['industry', 'created_at']
    search_fields = ['name', 'business_number']
    inlines = [CustomerContactInline]


@admin.register(CustomerContact)
class CustomerContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'position', 'email', 'phone', 'is_primary']
    list_filter = ['is_primary', 'company']
    search_fields = ['name', 'email', 'company__name']


# ============================================================
# 파이프라인 / 단계
# ============================================================
class SalesStageInline(admin.TabularInline):
    model = SalesStage
    extra = 1
    ordering = ['order']


@admin.register(SalesPipeline)
class SalesPipelineAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_default', 'is_active', 'created_at']
    list_filter = ['is_default', 'is_active']
    inlines = [SalesStageInline]


@admin.register(SalesStage)
class SalesStageAdmin(admin.ModelAdmin):
    list_display = ['name', 'pipeline', 'order', 'stage_type', 'probability', 'color']
    list_filter = ['pipeline', 'stage_type']
    ordering = ['pipeline', 'order']


# ============================================================
# 영업 기회
# ============================================================
class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0
    readonly_fields = ['activity_type', 'title', 'created_by', 'created_at']
    can_delete = False


class LeadTaskInline(admin.TabularInline):
    model = LeadTask
    extra = 1


class LeadFileInline(admin.TabularInline):
    model = LeadFile
    extra = 1


@admin.register(SalesLead)
class SalesLeadAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'pipeline', 'stage', 'company', 
        'owner', 'expected_amount', 'status', 'created_at'
    ]
    list_filter = ['pipeline', 'stage', 'status', 'owner', 'created_at']
    search_fields = ['title', 'description', 'company__name']
    readonly_fields = ['stage_entered_at', 'created_at', 'updated_at']
    filter_horizontal = ['assignees']
    inlines = [LeadActivityInline, LeadTaskInline, LeadFileInline]
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('title', 'description', 'pipeline', 'stage')
        }),
        ('고객 정보', {
            'fields': ('company', 'contact')
        }),
        ('금액/일정', {
            'fields': ('expected_amount', 'expected_close_date')
        }),
        ('담당자', {
            'fields': ('owner', 'assignees')
        }),
        ('상태', {
            'fields': ('status', 'probability', 'lost_reason')
        }),
        ('추적', {
            'fields': ('stage_entered_at', 'last_contacted_at', 'next_action_due_at'),
            'classes': ('collapse',)
        }),
        ('연결', {
            'fields': ('contract_id', 'project_id', 'source', 'tags'),
            'classes': ('collapse',)
        }),
        ('메타', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ['lead', 'activity_type', 'title', 'created_by', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['lead__title', 'title', 'content']


@admin.register(LeadTask)
class LeadTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'lead', 'assignee', 'due_date', 'priority', 'is_completed']
    list_filter = ['is_completed', 'priority', 'due_date']
    search_fields = ['title', 'lead__title']


@admin.register(LeadFile)
class LeadFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'lead', 'size', 'uploaded_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'lead__title']


# ============================================================
# 견적서
# ============================================================
class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 1


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = [
        'quote_number', 'title', 'lead', 'company', 
        'total_amount', 'status', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['quote_number', 'title', 'lead__title']
    readonly_fields = ['quote_number', 'subtotal', 'tax_amount', 'total_amount']
    inlines = [QuoteItemInline]


@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_default', 'created_by', 'created_at']
    list_filter = ['is_default']
