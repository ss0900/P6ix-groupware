# backend/meeting/admin.py
from django.contrib import admin
from .models import (
    MeetingRoom, Meeting, MeetingParticipant,
    Calendar, Schedule, ScheduleAttendee,
    Resource, ResourceReservation
)


@admin.register(MeetingRoom)
class MeetingRoomAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "location", "capacity", "is_active", "order"]
    list_filter = ["is_active"]
    search_fields = ["name", "location"]
    ordering = ["order", "name"]


class MeetingParticipantInline(admin.TabularInline):
    model = MeetingParticipant
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "schedule", "location_type", "is_urgent", "author", "created_at"]
    list_filter = ["location_type", "is_urgent", "schedule"]
    search_fields = ["title", "location", "agenda"]
    raw_id_fields = ["author", "meeting_room"]
    date_hierarchy = "schedule"
    inlines = [MeetingParticipantInline]


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "meeting", "user", "responded", "is_attending", "responded_at"]
    list_filter = ["responded", "is_attending"]
    raw_id_fields = ["meeting", "user"]


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
    list_display = ["id", "title", "scope", "event_type", "start", "end", "owner", "created_at"]
    list_filter = ["scope", "event_type", "status", "is_all_day", "is_recurring"]
    search_fields = ["title", "memo", "location"]
    raw_id_fields = ["owner", "company", "calendar"]
    date_hierarchy = "start"
    filter_horizontal = ["participants"]
    inlines = [ScheduleAttendeeInline]


@admin.register(ScheduleAttendee)
class ScheduleAttendeeAdmin(admin.ModelAdmin):
    list_display = ["id", "schedule", "user", "response", "responded_at"]
    list_filter = ["response"]
    raw_id_fields = ["schedule", "user"]


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "resource_type", "capacity", "is_active", "requires_approval", "order"]
    list_filter = ["resource_type", "is_active", "requires_approval"]
    search_fields = ["name", "description", "location"]
    ordering = ["order", "name"]


@admin.register(ResourceReservation)
class ResourceReservationAdmin(admin.ModelAdmin):
    list_display = ["id", "resource", "start", "end", "reserved_by", "status", "created_at"]
    list_filter = ["status", "resource__resource_type"]
    search_fields = ["purpose", "note"]
    raw_id_fields = ["resource", "schedule", "reserved_by", "approved_by"]
    date_hierarchy = "start"

