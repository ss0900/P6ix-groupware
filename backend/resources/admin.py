# backend/resources/admin.py
from django.contrib import admin
from .models import Folder, FolderPermission, Resource, AttachmentLink, DownloadHistory, ActivityLog


class FolderPermissionInline(admin.TabularInline):
    model = FolderPermission
    extra = 1


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'owner', 'owner_scope', 'is_public', 'is_deleted', 'created_at']
    list_filter = ['is_public', 'is_deleted', 'owner_scope', 'created_at']
    search_fields = ['name', 'description']
    raw_id_fields = ['parent', 'owner', 'deleted_by']
    inlines = [FolderPermissionInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FolderPermission)
class FolderPermissionAdmin(admin.ModelAdmin):
    list_display = ['folder', 'user', 'department', 'permission', 'inherit']
    list_filter = ['permission', 'inherit']
    search_fields = ['folder__name', 'user__username', 'department']
    raw_id_fields = ['folder', 'user']


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'folder', 'resource_type', 'file_size', 'uploader', 'is_deleted', 'created_at']
    list_filter = ['resource_type', 'is_deleted', 'is_temporary', 'created_at']
    search_fields = ['name', 'description', 'tags']
    raw_id_fields = ['folder', 'uploader', 'deleted_by', 'previous_version']
    readonly_fields = ['created_at', 'updated_at', 'checksum', 'download_count']


@admin.register(AttachmentLink)
class AttachmentLinkAdmin(admin.ModelAdmin):
    list_display = ['document', 'source_type', 'source_id', 'source_title', 'created_by', 'created_at']
    list_filter = ['source_type', 'created_at']
    search_fields = ['source_title', 'document__name']
    raw_id_fields = ['document', 'created_by']
    readonly_fields = ['created_at']


@admin.register(DownloadHistory)
class DownloadHistoryAdmin(admin.ModelAdmin):
    list_display = ['resource', 'user', 'downloaded_at', 'ip_address']
    list_filter = ['downloaded_at']
    search_fields = ['resource__name', 'user__username']
    raw_id_fields = ['resource', 'user']
    readonly_fields = ['downloaded_at']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource', 'folder', 'created_at', 'ip_address']
    list_filter = ['action', 'created_at']
    search_fields = ['user__username', 'resource__name', 'folder__name']
    raw_id_fields = ['resource', 'folder', 'user']
    readonly_fields = ['created_at']
