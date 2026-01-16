# backend/meeting/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import MeetingRoom, Meeting, MeetingParticipant, Schedule, ScheduleAttendee


class MeetingRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingRoom
        fields = [
            "id", "name", "location", "capacity",
            "description", "is_active", "color", "order",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MeetingParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_name = serializers.SerializerMethodField()
    position = serializers.CharField(source="user.position", read_only=True, default="")

    class Meta:
        model = MeetingParticipant
        fields = [
            "id", "user_id", "user_name", "position",
            "responded", "is_attending", "responded_at"
        ]
        read_only_fields = ["id", "responded_at"]

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.last_name}{obj.user.first_name}"
        return ""


class MeetingListSerializer(serializers.ModelSerializer):
    """회의 목록용"""
    author_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source="meeting_room.name", read_only=True, default="")
    participant_count = serializers.SerializerMethodField()
    is_required_for_me = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "schedule", "location_type", "location",
            "meeting_room", "room_name", "is_urgent",
            "author", "author_name", "participant_count", "is_required_for_me",
            "created_at"
        ]

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.last_name}{obj.author.first_name}"
        return ""

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_is_required_for_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user).exists()


class MeetingDetailSerializer(serializers.ModelSerializer):
    """회의 상세용"""
    author_name = serializers.SerializerMethodField()
    room_name = serializers.CharField(source="meeting_room.name", read_only=True, default="")
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    is_required_for_me = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "schedule", "location_type", "location",
            "meeting_room", "room_name", "agenda", "result", "is_urgent",
            "author", "author_name", "participants", "is_required_for_me",
            "created_at", "updated_at"
        ]

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.last_name}{obj.author.first_name}"
        return ""

    def get_is_required_for_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user).exists()


class MeetingCreateSerializer(serializers.ModelSerializer):
    """회의 생성/수정용"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=[]
    )

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "schedule", "location_type", "location",
            "meeting_room", "agenda", "result", "is_urgent",
            "participant_ids"
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        meeting = Meeting.objects.create(**validated_data)

        # 참석자 추가
        for user_id in participant_ids:
            MeetingParticipant.objects.create(
                meeting=meeting,
                user_id=user_id
            )

        return meeting

    def update(self, instance, validated_data):
        participant_ids = validated_data.pop("participant_ids", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 참석자 업데이트
        if participant_ids is not None:
            # 기존 참석자 삭제
            instance.participants.all().delete()
            # 새 참석자 추가
            for user_id in participant_ids:
                MeetingParticipant.objects.create(
                    meeting=instance,
                    user_id=user_id
                )

        return instance


class ScheduleAttendeeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleAttendee
        fields = ["id", "user", "user_name", "response", "responded_at"]
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

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "scope", "color",
            "start", "end", "is_all_day",
            "owner", "owner_name", "participant_count", "participants",
            "memo"
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

    class Meta:
        model = Schedule
        fields = [
            "id", "title", "scope", "color",
            "start", "end", "is_all_day",
            "memo", "company",
            "owner", "owner_name",
            "participants", "attendee_responses",
            "is_recurring", "recurrence_rule", "reminder_minutes",
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
            "memo", "company",
            "is_recurring", "recurrence_rule", "reminder_minutes",
            "participant_ids"
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
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
