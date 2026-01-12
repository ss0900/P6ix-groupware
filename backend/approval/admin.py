# backend/approval/admin.py
from django.contrib import admin
from .models import DocumentTemplate, Document, ApprovalLine, ApprovalAction


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "description"]


class ApprovalLineInline(admin.TabularInline):
    model = ApprovalLine
    extra = 0
    raw_id_fields = ["approver"]


class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0
    readonly_fields = ["actor", "action", "comment", "created_at"]
    can_delete = False


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "priority", "drafted_at"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "content", "author__username"]
    raw_id_fields = ["author", "template"]
    inlines = [ApprovalLineInline, ApprovalActionInline]


@admin.register(ApprovalLine)
class ApprovalLineAdmin(admin.ModelAdmin):
    list_display = ["document", "order", "approver", "approval_type", "status", "acted_at"]
    list_filter = ["status", "approval_type"]
    raw_id_fields = ["document", "approver"]


@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    list_display = ["document", "actor", "action", "created_at"]
    list_filter = ["action"]
    raw_id_fields = ["document", "actor"]
