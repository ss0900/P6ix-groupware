# backend/meeting/admin.py
from django.contrib import admin
from .models import MeetingRoom, Meeting, MeetingParticipant, Schedule, ScheduleAttendee


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


class ScheduleAttendeeInline(admin.TabularInline):
    model = ScheduleAttendee
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "scope", "start", "end", "owner", "created_at"]
    list_filter = ["scope", "is_all_day", "is_recurring"]
    search_fields = ["title", "memo"]
    raw_id_fields = ["owner", "company"]
    date_hierarchy = "start"
    filter_horizontal = ["participants"]
    inlines = [ScheduleAttendeeInline]


@admin.register(ScheduleAttendee)
class ScheduleAttendeeAdmin(admin.ModelAdmin):
    list_display = ["id", "schedule", "user", "response", "responded_at"]
    list_filter = ["response"]
    raw_id_fields = ["schedule", "user"]
