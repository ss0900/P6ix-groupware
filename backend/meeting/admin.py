# backend/meeting/admin.py
from django.contrib import admin
from .models import MeetingRoom, Schedule, ScheduleAttendee


@admin.register(MeetingRoom)
class MeetingRoomAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "capacity", "is_active", "color"]
    list_filter = ["is_active"]
    search_fields = ["name", "location"]


class ScheduleAttendeeInline(admin.TabularInline):
    model = ScheduleAttendee
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ["title", "schedule_type", "start_time", "end_time", "author", "meeting_room"]
    list_filter = ["schedule_type", "is_all_day", "is_recurring"]
    search_fields = ["title", "description", "author__username"]
    raw_id_fields = ["author", "meeting_room"]
    filter_horizontal = ["attendees"]
    inlines = [ScheduleAttendeeInline]
    date_hierarchy = "start_time"


@admin.register(ScheduleAttendee)
class ScheduleAttendeeAdmin(admin.ModelAdmin):
    list_display = ["schedule", "user", "response", "responded_at"]
    list_filter = ["response"]
    raw_id_fields = ["schedule", "user"]
