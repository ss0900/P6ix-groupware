# backend/approval/admin.py
from django.contrib import admin
from .models import DocumentTemplate, Document, ApprovalLine, ApprovalAction, Attachment


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "content"]


class ApprovalLineInline(admin.TabularInline):
    model = ApprovalLine
    extra = 0
    raw_id_fields = ["approver"]


class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0
    readonly_fields = ["actor", "action", "comment", "created_at"]
    can_delete = False


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    readonly_fields = ["filename", "file_size", "uploaded_by", "uploaded_at"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["document_number", "title", "author", "status", "drafted_at"]
    list_filter = ["status", "template"]
    search_fields = ["title", "content", "document_number", "author__username"]
    raw_id_fields = ["author", "template"]
    inlines = [ApprovalLineInline, ApprovalActionInline, AttachmentInline]


@admin.register(ApprovalLine)
class ApprovalLineAdmin(admin.ModelAdmin):
    list_display = ["document", "order", "approver", "approval_type", "status", "is_read", "acted_at"]
    list_filter = ["status", "approval_type", "is_read"]
    raw_id_fields = ["document", "approver"]


@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    list_display = ["document", "actor", "action", "created_at"]
    list_filter = ["action"]
    raw_id_fields = ["document", "actor"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["filename", "document", "file_size", "uploaded_by", "uploaded_at"]
    list_filter = ["uploaded_at"]
    search_fields = ["filename", "document__title"]
    raw_id_fields = ["document", "uploaded_by"]
