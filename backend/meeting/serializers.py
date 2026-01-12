# backend/meeting/serializers.py
from rest_framework import serializers
from .models import MeetingRoom, Schedule, ScheduleAttendee


class MeetingRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingRoom
        fields = [
            "id", "name", "location", "capacity",
            "description", "is_active", "color", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class ScheduleAttendeeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleAttendee
        fields = ["id", "user", "user_name", "response", "responded_at"]
        read_only_fields = ["id", "responded_at"]

    def get_user_name(self, obj):
        return f"{obj.user.last_name}{obj.user.first_name}" if obj.user else ""


class ScheduleListSerializer(serializers.ModelSerializer):
    """일정 목록용 (캘린더 표시)"""
    author_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source="meeting_room.name", read_only=True)
    attendee_count = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "schedule_type", "color",
            "start_time", "end_time", "is_all_day",
            "location", "meeting_room", "room_name",
            "author", "author_name", "attendee_count"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_attendee_count(self, obj):
        return obj.attendees.count()


class ScheduleDetailSerializer(serializers.ModelSerializer):
    """일정 상세용"""
    author_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source="meeting_room.name", read_only=True)
    attendee_responses = ScheduleAttendeeSerializer(many=True, read_only=True)
    attendees_info = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "description", "schedule_type", "color",
            "start_time", "end_time", "is_all_day",
            "location", "meeting_room", "room_name",
            "author", "author_name",
            "attendees", "attendees_info", "attendee_responses",
            "is_recurring", "recurrence_rule", "reminder_minutes",
            "created_at", "updated_at"
        ]

    def get_author_name(self, obj):
        return f"{obj.author.last_name}{obj.author.first_name}" if obj.author else ""

    def get_attendees_info(self, obj):
        return [
            {"id": u.id, "name": f"{u.last_name}{u.first_name}"}
            for u in obj.attendees.all()
        ]


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """일정 생성용"""
    attendee_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "description", "schedule_type", "color",
            "start_time", "end_time", "is_all_day",
            "location", "meeting_room",
            "is_recurring", "recurrence_rule", "reminder_minutes",
            "attendee_ids"
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        attendee_ids = validated_data.pop("attendee_ids", [])
        schedule = Schedule.objects.create(**validated_data)
        
        # 참석자 추가
        if attendee_ids:
            schedule.attendees.set(attendee_ids)
            # 참석 응답 레코드 생성
            for user_id in attendee_ids:
                ScheduleAttendee.objects.get_or_create(
                    schedule=schedule, user_id=user_id
                )
        
        return schedule

    def update(self, instance, validated_data):
        attendee_ids = validated_data.pop("attendee_ids", None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 참석자 업데이트
        if attendee_ids is not None:
            instance.attendees.set(attendee_ids)
            # 기존 응답 삭제 후 재생성
            instance.attendee_responses.exclude(user_id__in=attendee_ids).delete()
            for user_id in attendee_ids:
                ScheduleAttendee.objects.get_or_create(
                    schedule=instance, user_id=user_id
                )
        
        return instance
