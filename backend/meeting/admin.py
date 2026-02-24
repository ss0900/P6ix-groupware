# backend/meeting/admin.py
from django.contrib import admin
from .models import (
    Calendar, Schedule, ScheduleAttendee,
    Resource, ResourceReservation
)


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "category", "owner", "is_active", "is_default", "order"]
    list_filter = ["category", "is_active", "is_default"]
    search_fields = ["name", "description"]
    raw_id_fields = ["owner", "company"]
    ordering = ["order", "name"]


class ScheduleAttendeeInline(admin.TabularInline):
    model = ScheduleAttendee
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "event_type", "scope", "start", "end", "owner", "is_urgent", "created_at"]
    list_filter = ["scope", "event_type", "status", "is_all_day", "is_recurring", "is_urgent", "location_type"]
    search_fields = ["title", "memo", "location", "agenda"]
    raw_id_fields = ["owner", "company", "calendar", "resource"]
    date_hierarchy = "start"
    filter_horizontal = ["participants"]
    inlines = [ScheduleAttendeeInline]
    fieldsets = (
        ("기본 정보", {
            "fields": ("title", "scope", "event_type", "status", "visibility", "color")
        }),
        ("일시", {
            "fields": ("start", "end", "is_all_day")
        }),
        ("장소", {
            "fields": ("location", "location_type", "meet_url", "resource")
        }),
        ("회의 설정", {
            "fields": ("agenda", "result", "is_urgent"),
            "classes": ("collapse",),
        }),
        ("참여자", {
            "fields": ("owner", "participants")
        }),
        ("기타", {
            "fields": ("calendar", "company", "memo", "reminder_minutes"),
            "classes": ("collapse",),
        }),
        ("반복 설정", {
            "fields": ("is_recurring", "rrule", "recurrence_parent", "recurrence_exception_date"),
            "classes": ("collapse",),
        }),
    )


@admin.register(ScheduleAttendee)
class ScheduleAttendeeAdmin(admin.ModelAdmin):
    list_display = ["id", "schedule", "user", "response", "is_attending", "responded_at"]
    list_filter = ["response", "is_attending"]
    raw_id_fields = ["schedule", "user"]


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "resource_type", "capacity", "location", "is_active", "requires_approval", "order"]
    list_filter = ["resource_type", "is_active", "requires_approval"]
    search_fields = ["name", "description", "location", "equipment"]
    ordering = ["order", "name"]


@admin.register(ResourceReservation)
class ResourceReservationAdmin(admin.ModelAdmin):
    list_display = ["id", "resource", "start", "end", "reserved_by", "status", "created_at"]
    list_filter = ["status", "resource__resource_type"]
    search_fields = ["purpose", "note"]
    raw_id_fields = ["resource", "schedule", "reserved_by", "approved_by"]
    date_hierarchy = "start"
