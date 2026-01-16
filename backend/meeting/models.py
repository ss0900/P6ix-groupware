# backend/meeting/models.py
from django.db import models
from django.conf import settings


class MeetingRoom(models.Model):
    """회의실"""
    name = models.CharField("회의실명", max_length=100)
    location = models.CharField("위치", max_length=200, blank=True)
    capacity = models.PositiveIntegerField("수용 인원", default=10)
    description = models.TextField("설명", blank=True)
    is_active = models.BooleanField("사용 가능", default=True)
    color = models.CharField("색상", max_length=20, default="#3B82F6")
    order = models.PositiveIntegerField("정렬 순서", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "회의실"
        verbose_name_plural = "회의실"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Meeting(models.Model):
    """회의 일정"""
    LOCATION_TYPE_ONLINE = "online"
    LOCATION_TYPE_OFFLINE_ROOM = "offline_room"
    LOCATION_TYPE_OFFLINE_ADDRESS = "offline_address"

    LOCATION_TYPE_CHOICES = [
        (LOCATION_TYPE_ONLINE, "온라인"),
        (LOCATION_TYPE_OFFLINE_ROOM, "오프라인(회의실)"),
        (LOCATION_TYPE_OFFLINE_ADDRESS, "오프라인(주소)"),
    ]

    title = models.CharField("제목", max_length=255)
    schedule = models.DateTimeField("일정")
    location_type = models.CharField(
        "장소 구분",
        max_length=20,
        choices=LOCATION_TYPE_CHOICES,
        default=LOCATION_TYPE_OFFLINE_ADDRESS,
        db_index=True,
    )
    location = models.TextField("장소", blank=True)
    meeting_room = models.ForeignKey(
        MeetingRoom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meetings",
        verbose_name="회의실",
    )
    agenda = models.TextField("안건", blank=True)
    result = models.TextField("회의 결과", blank=True)
    is_urgent = models.BooleanField("긴급", default=False, db_index=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_meetings",
        verbose_name="작성자",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "회의"
        verbose_name_plural = "회의 목록"
        ordering = ["-schedule"]
        indexes = [
            models.Index(fields=["schedule"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.schedule.strftime('%Y-%m-%d %H:%M')})"


class MeetingParticipant(models.Model):
    """회의 참석자"""
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_attendances",
    )
    responded = models.BooleanField("참여 응답 여부", default=False)
    is_attending = models.BooleanField("참여", default=False)
    responded_at = models.DateTimeField("응답 시간", null=True, blank=True)

    class Meta:
        verbose_name = "회의 참석자"
        verbose_name_plural = "회의 참석자 목록"
        unique_together = ["meeting", "user"]
        indexes = [
            models.Index(fields=["meeting", "responded", "is_attending"]),
            models.Index(fields=["user", "responded", "is_attending"]),
        ]

    def __str__(self):
        status = "참석" if self.is_attending else "불참" if self.responded else "미응답"
        return f"{self.user.username} ({status})"


class Schedule(models.Model):
    """일정 (개인/회사)"""
    SCOPE_PERSONAL = "personal"
    SCOPE_COMPANY = "company"

    SCOPE_CHOICES = [
        (SCOPE_PERSONAL, "개인"),
        (SCOPE_COMPANY, "회사"),
    ]

    title = models.CharField("제목", max_length=255)
    start = models.DateTimeField("시작일시")
    end = models.DateTimeField("종료일시", null=True, blank=True)
    is_all_day = models.BooleanField("종일", default=False)

    scope = models.CharField(
        "범위",
        max_length=20,
        choices=SCOPE_CHOICES,
        default=SCOPE_PERSONAL,
        db_index=True,
    )

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="schedules",
        verbose_name="회사",
    )

    memo = models.TextField("메모", blank=True)
    color = models.CharField("색상", max_length=20, default="#3B82F6")

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_schedules",
        verbose_name="작성자",
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="schedule_participations",
        blank=True,
        verbose_name="참여자",
    )

    # 반복 일정
    is_recurring = models.BooleanField("반복 일정", default=False)
    recurrence_rule = models.CharField("반복 규칙", max_length=100, blank=True)

    # 알림
    reminder_minutes = models.PositiveIntegerField("알림 (분 전)", default=30)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "일정"
        verbose_name_plural = "일정 목록"
        ordering = ["-start"]
        indexes = [
            models.Index(fields=["scope", "start"]),
        ]

    def __str__(self):
        return f"[{self.get_scope_display()}] {self.title}"


class ScheduleAttendee(models.Model):
    """일정 참석자 응답"""
    RESPONSE_CHOICES = [
        ("pending", "대기"),
        ("accepted", "수락"),
        ("declined", "거절"),
        ("tentative", "미정"),
    ]

    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="attendee_responses",
        verbose_name="일정",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="schedule_responses",
        verbose_name="사용자",
    )
    response = models.CharField(
        "응답",
        max_length=20,
        choices=RESPONSE_CHOICES,
        default="pending",
    )
    responded_at = models.DateTimeField("응답 시간", null=True, blank=True)

    class Meta:
        verbose_name = "참석 응답"
        verbose_name_plural = "참석 응답"
        unique_together = ["schedule", "user"]

    def __str__(self):
        return f"{self.user} - {self.schedule.title}: {self.get_response_display()}"
