# backend/timeline/admin.py
from django.contrib import admin
from .models import TimelineEvent, TimelineFavorite


@admin.register(TimelineEvent)
class TimelineEventAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "activity_type", "author", "is_active", "created_at"]
    list_filter = ["activity_type", "is_active", "created_at"]
    search_fields = ["title", "content", "author__username", "author__first_name", "author__last_name"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(TimelineFavorite)
class TimelineFavoriteAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "event", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__username", "event__title"]
    ordering = ["-created_at"]
