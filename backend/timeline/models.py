# backend/timeline/models.py
from django.db import models
from django.conf import settings


class TimelineEvent(models.Model):
    """타임라인 이벤트"""
    ACTIVITY_CHOICES = [
        ("approval", "결재"),
        ("board", "게시판"),
        ("schedule", "일정"),
        ("task", "업무"),
        ("announcement", "공지"),
        ("attendance", "근태/출결"),
        ("survey", "설문조사"),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="timeline_events",
        verbose_name="작성자"
    )
    activity_type = models.CharField(
        "활동 유형",
        max_length=20,
        choices=ACTIVITY_CHOICES,
        default="board"
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용", blank=True)
    
    # 원본 객체 참조 (선택적)
    reference_model = models.CharField(
        "참조 모델",
        max_length=50,
        blank=True,
        help_text="예: approval.Document, board.Post"
    )
    reference_id = models.PositiveIntegerField(
        "참조 ID",
        null=True,
        blank=True
    )
    
    # 메타 정보
    is_active = models.BooleanField("활성화", default=True)
    created_at = models.DateTimeField("생성일시", auto_now_add=True)
    updated_at = models.DateTimeField("수정일시", auto_now=True)

    class Meta:
        verbose_name = "타임라인 이벤트"
        verbose_name_plural = "타임라인 이벤트"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["activity_type", "-created_at"]),
            models.Index(fields=["author", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.get_activity_type_display()}] {self.title}"


class TimelineFavorite(models.Model):
    """타임라인 즐겨찾기"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="timeline_favorites",
        verbose_name="사용자"
    )
    event = models.ForeignKey(
        TimelineEvent,
        on_delete=models.CASCADE,
        related_name="favorites",
        verbose_name="이벤트"
    )
    created_at = models.DateTimeField("생성일시", auto_now_add=True)

    class Meta:
        verbose_name = "즐겨찾기"
        verbose_name_plural = "즐겨찾기"
        unique_together = ["user", "event"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.event.title}"
