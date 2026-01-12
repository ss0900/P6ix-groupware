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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "회의실"
        verbose_name_plural = "회의실"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Schedule(models.Model):
    """일정"""
    SCHEDULE_TYPES = [
        ("personal", "개인 일정"),
        ("team", "팀 일정"),
        ("company", "전사 일정"),
        ("meeting", "회의"),
    ]

    title = models.CharField("제목", max_length=200)
    description = models.TextField("설명", blank=True)
    schedule_type = models.CharField("일정 유형", max_length=20, choices=SCHEDULE_TYPES, default="personal")
    
    # 시간
    start_time = models.DateTimeField("시작 시간")
    end_time = models.DateTimeField("종료 시간")
    is_all_day = models.BooleanField("종일", default=False)
    
    # 장소
    location = models.CharField("장소", max_length=200, blank=True)
    meeting_room = models.ForeignKey(
        MeetingRoom, on_delete=models.SET_NULL, 
        null=True, blank=True, related_name="schedules", verbose_name="회의실"
    )
    
    # 작성자
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="schedules", verbose_name="작성자"
    )
    
    # 참석자
    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name="attending_schedules", verbose_name="참석자"
    )
    
    # 반복
    is_recurring = models.BooleanField("반복 일정", default=False)
    recurrence_rule = models.CharField("반복 규칙", max_length=100, blank=True)
    
    # 알림
    reminder_minutes = models.PositiveIntegerField("알림 (분 전)", default=30)
    
    # 색상
    color = models.CharField("색상", max_length=20, default="#3B82F6")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "일정"
        verbose_name_plural = "일정"
        ordering = ["start_time"]

    def __str__(self):
        return f"[{self.get_schedule_type_display()}] {self.title}"


class ScheduleAttendee(models.Model):
    """일정 참석자 응답"""
    RESPONSE_CHOICES = [
        ("pending", "대기"),
        ("accepted", "수락"),
        ("declined", "거절"),
        ("tentative", "미정"),
    ]

    schedule = models.ForeignKey(
        Schedule, on_delete=models.CASCADE,
        related_name="attendee_responses", verbose_name="일정"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="schedule_responses", verbose_name="사용자"
    )
    response = models.CharField("응답", max_length=20, choices=RESPONSE_CHOICES, default="pending")
    responded_at = models.DateTimeField("응답 시간", null=True, blank=True)

    class Meta:
        verbose_name = "참석 응답"
        verbose_name_plural = "참석 응답"
        unique_together = ["schedule", "user"]

    def __str__(self):
        return f"{self.user} - {self.schedule.title}: {self.get_response_display()}"
