# backend/meeting/models.py
from django.db import models
from django.conf import settings


class Calendar(models.Model):
    """캘린더 (분류)"""
    # 카테고리 (시스템 기본 캘린더용)
    CATEGORY_ALL = "all"
    CATEGORY_SHARED = "shared"
    CATEGORY_PERSONAL = "personal"
    CATEGORY_HEADQUARTERS = "headquarters"  # 본사일정

    CATEGORY_CHOICES = [
        (CATEGORY_ALL, "전체 일정"),
        (CATEGORY_SHARED, "공유 일정"),
        (CATEGORY_PERSONAL, "개인 일정"),
        (CATEGORY_HEADQUARTERS, "본사일정"),
    ]

    # 캘린더 타입
    CALENDAR_TYPE_SYSTEM = "system"
    CALENDAR_TYPE_CUSTOM = "custom"

    CALENDAR_TYPE_CHOICES = [
        (CALENDAR_TYPE_SYSTEM, "시스템"),
        (CALENDAR_TYPE_CUSTOM, "사용자 정의"),
    ]

    name = models.CharField("캘린더명", max_length=100)
    category = models.CharField(
        "분류",
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_PERSONAL,
        blank=True,
        db_index=True,
    )
    calendar_type = models.CharField(
        "캘린더 타입",
        max_length=20,
        choices=CALENDAR_TYPE_CHOICES,
        default=CALENDAR_TYPE_SYSTEM,
        db_index=True,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sub_calendars",
        verbose_name="상위 캘린더",
    )
    color = models.CharField("색상", max_length=20, default="#3B82F6")
    description = models.TextField("설명", blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_calendars",
        verbose_name="소유자",
    )
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="calendars",
        verbose_name="회사",
    )
    is_active = models.BooleanField("활성화", default=True)
    is_default = models.BooleanField("기본 캘린더", default=False)
    order = models.PositiveIntegerField("정렬 순서", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "캘린더"
        verbose_name_plural = "캘린더"
        ordering = ["order", "name"]
        indexes = [
            models.Index(fields=["calendar_type", "category"]),
        ]

    def __str__(self):
        if self.calendar_type == self.CALENDAR_TYPE_CUSTOM:
            return f"[사용자정의] {self.name}"
        return f"[{self.get_category_display()}] {self.name}"


class Resource(models.Model):
    """자원 (회의실/차량/장비 등)"""
    RESOURCE_TYPE_ROOM = "room"
    RESOURCE_TYPE_VEHICLE = "vehicle"
    RESOURCE_TYPE_EQUIPMENT = "equipment"

    RESOURCE_TYPE_CHOICES = [
        (RESOURCE_TYPE_ROOM, "회의실"),
        (RESOURCE_TYPE_VEHICLE, "차량"),
        (RESOURCE_TYPE_EQUIPMENT, "장비"),
    ]

    name = models.CharField("자원명", max_length=100)
    resource_type = models.CharField(
        "자원유형",
        max_length=20,
        choices=RESOURCE_TYPE_CHOICES,
        default=RESOURCE_TYPE_ROOM,
        db_index=True,
    )
    description = models.TextField("설명", blank=True)
    capacity = models.PositiveIntegerField("수용인원/좌석", default=1)
    location = models.CharField("위치", max_length=200, blank=True)
    # 회의실 전용 필드 (MeetingRoom에서 통합)
    equipment = models.TextField("장비", blank=True, help_text="보유 장비 목록")
    color = models.CharField("색상", max_length=20, default="#10B981")
    is_active = models.BooleanField("사용가능", default=True)
    requires_approval = models.BooleanField("승인필요", default=False)
    order = models.PositiveIntegerField("정렬 순서", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "자원"
        verbose_name_plural = "자원"
        ordering = ["order", "name"]

    def __str__(self):
        return f"[{self.get_resource_type_display()}] {self.name}"


class Schedule(models.Model):
    """일정 (개인/회사/회의 통합)"""
    SCOPE_PERSONAL = "personal"
    SCOPE_COMPANY = "company"

    SCOPE_CHOICES = [
        (SCOPE_PERSONAL, "개인"),
        (SCOPE_COMPANY, "회사"),
    ]

    # 일정 유형
    EVENT_TYPE_GENERAL = "general"
    EVENT_TYPE_ANNUAL = "annual"
    EVENT_TYPE_MONTHLY = "monthly"
    EVENT_TYPE_HALF = "half"
    EVENT_TYPE_MEETING = "meeting"
    EVENT_TYPE_TRIP = "trip"

    EVENT_TYPE_CHOICES = [
        (EVENT_TYPE_GENERAL, "일반"),
        (EVENT_TYPE_ANNUAL, "연차"),
        (EVENT_TYPE_MONTHLY, "월차"),
        (EVENT_TYPE_HALF, "반차"),
        (EVENT_TYPE_MEETING, "회의"),
        (EVENT_TYPE_TRIP, "출장"),
    ]

    # 상태
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_CONFIRMED, "확정"),
        (STATUS_CANCELLED, "취소"),
    ]

    # 공개범위
    VISIBILITY_PRIVATE = "private"
    VISIBILITY_ORGANIZATION = "organization"
    VISIBILITY_PUBLIC = "public"

    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, "개인"),
        (VISIBILITY_ORGANIZATION, "조직"),
        (VISIBILITY_PUBLIC, "전체"),
    ]

    # 회의 장소 유형 (Meeting 모델에서 통합)
    LOCATION_TYPE_NONE = ""
    LOCATION_TYPE_ONLINE = "online"
    LOCATION_TYPE_OFFLINE_ROOM = "offline_room"
    LOCATION_TYPE_OFFLINE_ADDRESS = "offline_address"

    LOCATION_TYPE_CHOICES = [
        (LOCATION_TYPE_NONE, "-"),
        (LOCATION_TYPE_ONLINE, "온라인"),
        (LOCATION_TYPE_OFFLINE_ROOM, "오프라인(회의실)"),
        (LOCATION_TYPE_OFFLINE_ADDRESS, "오프라인(주소)"),
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

    # 캘린더 연결
    calendar = models.ForeignKey(
        Calendar,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedules",
        verbose_name="캘린더",
    )

    event_type = models.CharField(
        "일정 유형",
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default=EVENT_TYPE_GENERAL,
        db_index=True,
    )
    location = models.CharField("장소", max_length=255, blank=True)
    status = models.CharField(
        "상태",
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CONFIRMED,
    )
    visibility = models.CharField(
        "공개범위",
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
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

    # ===== 회의 전용 필드 (Meeting 모델에서 통합) =====
    location_type = models.CharField(
        "장소 구분",
        max_length=20,
        choices=LOCATION_TYPE_CHOICES,
        default=LOCATION_TYPE_NONE,
        blank=True,
    )
    meet_url = models.URLField("온라인 링크", max_length=500, blank=True)
    resource = models.ForeignKey(
        Resource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedules",
        verbose_name="회의실/자원",
    )
    agenda = models.TextField("안건", blank=True)
    result = models.TextField("회의 결과", blank=True)
    is_urgent = models.BooleanField("긴급", default=False, db_index=True)

    # 반복 일정 (RFC 5545 RRULE)
    is_recurring = models.BooleanField("반복 일정", default=False)
    rrule = models.TextField("반복규칙(RRULE)", blank=True, help_text="RFC 5545 형식: FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260301")
    recurrence_parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recurrence_instances",
        verbose_name="반복 원본",
    )
    recurrence_exception_date = models.DateField("예외일", null=True, blank=True)

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
            models.Index(fields=["event_type", "start"]),
        ]

    def __str__(self):
        return f"[{self.get_event_type_display()}] {self.title}"


class ScheduleAttendee(models.Model):
    """일정 참석자 응답 (MeetingParticipant 통합)"""
    RESPONSE_PENDING = "pending"
    RESPONSE_ACCEPTED = "accepted"
    RESPONSE_DECLINED = "declined"
    RESPONSE_TENTATIVE = "tentative"

    RESPONSE_CHOICES = [
        (RESPONSE_PENDING, "대기"),
        (RESPONSE_ACCEPTED, "수락"),
        (RESPONSE_DECLINED, "거절"),
        (RESPONSE_TENTATIVE, "미정"),
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
        default=RESPONSE_PENDING,
    )
    # MeetingParticipant에서 통합된 필드
    is_attending = models.BooleanField("참석 여부", null=True, blank=True, help_text="True=참석, False=불참, None=미응답")
    responded_at = models.DateTimeField("응답 시간", null=True, blank=True)

    class Meta:
        verbose_name = "참석 응답"
        verbose_name_plural = "참석 응답"
        unique_together = ["schedule", "user"]
        indexes = [
            models.Index(fields=["schedule", "response"]),
            models.Index(fields=["user", "response"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.schedule.title}: {self.get_response_display()}"


class ResourceReservation(models.Model):
    """자원 예약"""
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "승인대기"),
        (STATUS_APPROVED, "승인"),
        (STATUS_REJECTED, "반려"),
    ]

    resource = models.ForeignKey(
        Resource,
        on_delete=models.CASCADE,
        related_name="reservations",
        verbose_name="자원",
    )
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="resource_reservations",
        verbose_name="일정",
    )
    start = models.DateTimeField("시작")
    end = models.DateTimeField("종료")
    purpose = models.CharField("목적", max_length=255, blank=True)
    status = models.CharField(
        "상태",
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resource_reservations",
        verbose_name="예약자",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_reservations",
        verbose_name="승인자",
    )
    approved_at = models.DateTimeField("승인일시", null=True, blank=True)
    note = models.TextField("비고", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "자원 예약"
        verbose_name_plural = "자원 예약"
        ordering = ["-start"]
        indexes = [
            models.Index(fields=["resource", "start", "end"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.resource.name}: {self.start.strftime('%Y-%m-%d %H:%M')} ~ {self.end.strftime('%H:%M')}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # 중복 예약 검증
        if self.start >= self.end:
            raise ValidationError("종료 시간은 시작 시간보다 늦어야 합니다.")
        
        overlapping = ResourceReservation.objects.filter(
            resource=self.resource,
            end__gt=self.start,
            start__lt=self.end,
        ).exclude(pk=self.pk).exclude(status=self.STATUS_REJECTED)
        
        if overlapping.exists():
            raise ValidationError("해당 시간에 이미 예약이 있습니다.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
