# backend/meeting/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Calendar, Schedule, ScheduleAttendee,
    Resource, ResourceReservation
)


class ScheduleAttendeeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    position = serializers.CharField(source="user.position", read_only=True, default="")

    class Meta:
        model = ScheduleAttendee
        fields = ["id", "user", "user_name", "position", "response", "is_attending", "responded_at"]
        read_only_fields = ["id", "responded_at"]

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.last_name}{obj.user.first_name}"
        return ""


class ScheduleListSerializer(serializers.ModelSerializer):
    """일정 목록용 (캘린더 표시)"""
    owner_name = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    calendar_name = serializers.CharField(source="calendar.name", read_only=True, default="")
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True, default="")
    location_type_display = serializers.CharField(source="get_location_type_display", read_only=True)

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "scope", "color",
            "start", "end", "is_all_day",
            "owner", "owner_name", "participant_count", "participants",
            "memo", "calendar", "calendar_name",
            "event_type", "event_type_display", "location", "status", "visibility",
            # 회의 전용 필드
            "location_type", "location_type_display", "meet_url", "resource", "resource_name",
            "agenda", "is_urgent"
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.last_name}{obj.owner.first_name}"
        return ""

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_participants(self, obj):
        return [
            {"id": u.id, "name": f"{u.last_name}{u.first_name}"}
            for u in obj.participants.all()
        ]


class ScheduleDetailSerializer(serializers.ModelSerializer):
    """일정 상세용"""
    owner_name = serializers.SerializerMethodField()
    attendee_responses = ScheduleAttendeeSerializer(many=True, read_only=True)
    participants = serializers.SerializerMethodField()
    calendar_name = serializers.CharField(source="calendar.name", read_only=True, default="")
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    visibility_display = serializers.CharField(source="get_visibility_display", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True, default="")
    location_type_display = serializers.CharField(source="get_location_type_display", read_only=True)
    is_required_for_me = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "scope", "color",
            "start", "end", "is_all_day",
            "memo", "company", "calendar", "calendar_name",
            "event_type", "event_type_display", "location",
            "status", "status_display", "visibility", "visibility_display",
            "owner", "owner_name",
            "participants", "attendee_responses", "is_required_for_me",
            "is_recurring", "rrule", "reminder_minutes",
            # 회의 전용 필드
            "location_type", "location_type_display", "meet_url", "resource", "resource_name",
            "agenda", "result", "is_urgent",
            "created_at", "updated_at"
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.last_name}{obj.owner.first_name}"
        return ""

    def get_participants(self, obj):
        return [
            {"id": u.id, "name": f"{u.last_name}{u.first_name}"}
            for u in obj.participants.all()
        ]

    def get_is_required_for_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(id=request.user.id).exists()


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """일정 생성/수정용"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=[]
    )

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "scope", "color",
            "start", "end", "is_all_day",
            "memo", "company", "calendar",
            "event_type", "location", "status", "visibility",
            "is_recurring", "rrule", "reminder_minutes",
            # 회의 전용 필드
            "location_type", "meet_url", "resource", "agenda", "result", "is_urgent",
            "participant_ids"
        ]
        read_only_fields = ["id"]

    def _get_default_headquarters_calendar(self, validated_data, instance=None):
        if validated_data.get("calendar"):
            return validated_data.get("calendar")
        if instance is not None and getattr(instance, "calendar", None):
            return instance.calendar

        request = self.context.get("request")
        user = getattr(request, "user", None)
        company = validated_data.get("company")
        if company is None and user is not None and getattr(user, "is_authenticated", False):
            company = getattr(user, "company", None)

        qs = Calendar.objects.filter(
            category=Calendar.CATEGORY_HEADQUARTERS,
            is_active=True,
        )

        if company is not None:
            cal = qs.filter(company=company).order_by("-is_default", "order", "id").first()
            if cal:
                return cal

        if user is not None and getattr(user, "is_authenticated", False):
            cal = qs.filter(owner=user).order_by("-is_default", "order", "id").first()
            if cal:
                return cal

        cal = qs.filter(is_default=True).order_by("order", "id").first()
        if cal:
            return cal

        return qs.order_by("order", "id").first()

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        if not validated_data.get("calendar"):
            default_calendar = self._get_default_headquarters_calendar(validated_data)
            if default_calendar:
                validated_data["calendar"] = default_calendar
        schedule = Schedule.objects.create(**validated_data)

        # 참여자 추가
        if participant_ids:
            schedule.participants.set(participant_ids)
            # 참석 응답 레코드 생성
            for user_id in participant_ids:
                ScheduleAttendee.objects.get_or_create(
                    schedule=schedule, user_id=user_id
                )

        return schedule

    def update(self, instance, validated_data):
        participant_ids = validated_data.pop("participant_ids", None)
        if not validated_data.get("calendar") and not getattr(instance, "calendar", None):
            default_calendar = self._get_default_headquarters_calendar(
                validated_data, instance=instance
            )
            if default_calendar:
                validated_data["calendar"] = default_calendar

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 참여자 업데이트
        if participant_ids is not None:
            instance.participants.set(participant_ids)
            # 기존 응답 중 제외된 참석자 삭제
            instance.attendee_responses.exclude(user_id__in=participant_ids).delete()
            # 새 참석자 응답 레코드 생성
            for user_id in participant_ids:
                ScheduleAttendee.objects.get_or_create(
                    schedule=instance, user_id=user_id
                )

        return instance


# ===== 캘린더 Serializers =====

class CalendarSerializer(serializers.ModelSerializer):
    """캘린더 Serializer"""
    owner_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    calendar_type_display = serializers.CharField(source="get_calendar_type_display", read_only=True)
    schedule_count = serializers.SerializerMethodField()
    sub_calendars = serializers.SerializerMethodField()

    class Meta:
        model = Calendar
        fields = [
            "id", "name", "category", "category_display",
            "calendar_type", "calendar_type_display", "parent",
            "color", "description", "owner", "owner_name", "company",
            "is_active", "is_default", "order", "schedule_count",
            "sub_calendars", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.last_name}{obj.owner.first_name}"
        return ""

    def get_schedule_count(self, obj):
        return obj.schedules.count()

    def get_sub_calendars(self, obj):
        subs = obj.sub_calendars.filter(is_active=True).order_by("order", "name")
        return CalendarSerializer(subs, many=True).data


# ===== 자원 Serializers =====

class ResourceSerializer(serializers.ModelSerializer):
    """자원 Serializer"""
    resource_type_display = serializers.CharField(source="get_resource_type_display", read_only=True)
    reservation_count = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            "id", "name", "resource_type", "resource_type_display",
            "description", "capacity", "location", "equipment", "color",
            "is_active", "requires_approval", "order", "reservation_count",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_reservation_count(self, obj):
        return obj.reservations.filter(status__in=["pending", "approved"]).count()


class ResourceReservationSerializer(serializers.ModelSerializer):
    """자원 예약 Serializer"""
    resource_name = serializers.CharField(source="resource.name", read_only=True)
    resource_type = serializers.CharField(source="resource.resource_type", read_only=True)
    reserved_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ResourceReservation
        fields = [
            "id", "resource", "resource_name", "resource_type",
            "schedule", "start", "end", "purpose",
            "status", "status_display",
            "reserved_by", "reserved_by_name",
            "approved_by", "approved_by_name", "approved_at",
            "note", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "approved_at", "created_at", "updated_at"]

    def get_reserved_by_name(self, obj):
        if obj.reserved_by:
            return f"{obj.reserved_by.last_name}{obj.reserved_by.first_name}"
        return ""

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.last_name}{obj.approved_by.first_name}"
        return ""

    def validate(self, data):
        """중복 예약 검증"""
        resource = data.get("resource") or (self.instance.resource if self.instance else None)
        start = data.get("start") or (self.instance.start if self.instance else None)
        end = data.get("end") or (self.instance.end if self.instance else None)

        if start and end and start >= end:
            raise serializers.ValidationError("종료 시간은 시작 시간보다 늦어야 합니다.")

        if resource and start and end:
            overlapping = ResourceReservation.objects.filter(
                resource=resource,
                end__gt=start,
                start__lt=end,
            ).exclude(status="rejected")

            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)

            if overlapping.exists():
                raise serializers.ValidationError("해당 시간에 이미 예약이 있습니다.")

        return data
