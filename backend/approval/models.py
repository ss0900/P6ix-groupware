# backend/approval/models.py
from django.db import models
from django.conf import settings


class DocumentTemplate(models.Model):
    """결재 문서 양식"""
    name = models.CharField("양식명", max_length=100)
    description = models.TextField("설명", blank=True)
    category = models.CharField("분류", max_length=50, default="일반")
    content_template = models.TextField("내용 템플릿", blank=True, help_text="HTML 또는 Markdown 형식")
    is_active = models.BooleanField("활성화", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "결재 양식"
        verbose_name_plural = "결재 양식"
        ordering = ["category", "name"]

    def __str__(self):
        return f"[{self.category}] {self.name}"


class Document(models.Model):
    """결재 문서"""
    STATUS_CHOICES = [
        ("draft", "임시저장"),
        ("pending", "결재 중"),
        ("approved", "승인"),
        ("rejected", "반려"),
        ("canceled", "취소"),
    ]
    PRIORITY_CHOICES = [
        ("normal", "일반"),
        ("urgent", "긴급"),
        ("important", "중요"),
    ]

    template = models.ForeignKey(
        DocumentTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documents", verbose_name="양식"
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용", blank=True)
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    priority = models.CharField("우선순위", max_length=20, choices=PRIORITY_CHOICES, default="normal")
    
    # 작성자
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="authored_documents", verbose_name="기안자"
    )
    
    # 첨부파일 (추후 FileField로 확장 가능)
    attachment_count = models.PositiveIntegerField("첨부파일 수", default=0)
    
    # 날짜
    drafted_at = models.DateTimeField("기안일", auto_now_add=True)
    submitted_at = models.DateTimeField("제출일", null=True, blank=True)
    completed_at = models.DateTimeField("완료일", null=True, blank=True)
    
    # 메타
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "결재 문서"
        verbose_name_plural = "결재 문서"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"

    @property
    def current_approver(self):
        """현재 결재 차례인 사람"""
        pending = self.approval_lines.filter(status="pending").order_by("order").first()
        return pending.approver if pending else None


class ApprovalLine(models.Model):
    """결재선 (결재자 목록)"""
    STATUS_CHOICES = [
        ("waiting", "대기"),
        ("pending", "결재 대기"),
        ("approved", "승인"),
        ("rejected", "반려"),
        ("skipped", "건너뜀"),
    ]
    TYPE_CHOICES = [
        ("approval", "결재"),
        ("agreement", "합의"),
        ("reference", "참조"),
    ]

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE,
        related_name="approval_lines", verbose_name="문서"
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="approval_tasks", verbose_name="결재자"
    )
    order = models.PositiveIntegerField("순서", default=0)
    approval_type = models.CharField("결재 유형", max_length=20, choices=TYPE_CHOICES, default="approval")
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="waiting")
    
    comment = models.TextField("의견", blank=True)
    acted_at = models.DateTimeField("처리일", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "결재선"
        verbose_name_plural = "결재선"
        ordering = ["document", "order"]
        unique_together = ["document", "order"]

    def __str__(self):
        return f"{self.document.title} - {self.order}. {self.approver}"


class ApprovalAction(models.Model):
    """결재 이력 (로그)"""
    ACTION_CHOICES = [
        ("submit", "제출"),
        ("approve", "승인"),
        ("reject", "반려"),
        ("cancel", "취소"),
        ("return", "회수"),
        ("comment", "의견 추가"),
    ]

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE,
        related_name="actions", verbose_name="문서"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="approval_actions", verbose_name="처리자"
    )
    action = models.CharField("액션", max_length=20, choices=ACTION_CHOICES)
    comment = models.TextField("의견", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "결재 이력"
        verbose_name_plural = "결재 이력"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.document.title} - {self.get_action_display()} by {self.actor}"
