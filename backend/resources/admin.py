# backend/resources/admin.py
from django.contrib import admin
from .models import Folder, Resource, DownloadHistory


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "owner", "is_public", "created_at"]
    list_filter = ["is_public"]
    search_fields = ["name", "description"]
    raw_id_fields = ["parent", "owner"]


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ["name", "folder", "resource_type", "file_size", "download_count", "uploader", "created_at"]
    list_filter = ["resource_type", "folder"]
    search_fields = ["name", "description", "tags"]
    raw_id_fields = ["folder", "uploader"]
    readonly_fields = ["download_count", "view_count"]


@admin.register(DownloadHistory)
class DownloadHistoryAdmin(admin.ModelAdmin):
    list_display = ["resource", "user", "downloaded_at", "ip_address"]
    raw_id_fields = ["resource", "user"]
    date_hierarchy = "downloaded_at"
