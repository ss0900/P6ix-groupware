# backend/approval/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
import datetime


class DocumentTemplate(models.Model):
    """결재 문서 양식"""
    CATEGORY_CHOICES = [
        ("general", "일반"),
        ("leave", "휴가"),
        ("expense", "지출"),
        ("official", "공문"),
        ("report", "보고"),
        ("etc", "기타"),
    ]
    
    name = models.CharField("양식명", max_length=100)
    category = models.CharField("분류", max_length=50, choices=CATEGORY_CHOICES, default="general")
    content = models.TextField("내용", blank=True)
    is_active = models.BooleanField("활성화", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "결재 양식"
        verbose_name_plural = "결재 양식"
        ordering = ["category", "name"]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.name}"


class Document(models.Model):
    """결재 문서"""
    STATUS_CHOICES = [
        ("draft", "임시저장"),
        ("pending", "결재 중"),
        ("approved", "승인"),
        ("rejected", "반려"),
        ("canceled", "취소"),
    ]
    PRESERVATION_CHOICES = [
        (1, "1년"),
        (3, "3년"),
        (5, "5년"),
        (10, "10년"),
        (0, "영구"),
    ]

    # 문서 번호 (자동 생성)
    document_number = models.CharField("문서번호", max_length=50, blank=True, unique=True, null=True)
    
    template = models.ForeignKey(
        DocumentTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documents", verbose_name="양식"
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용", blank=True)
    form_data = models.JSONField("양식 데이터", default=dict, blank=True, help_text="양식 필드 값")
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    preservation_period = models.IntegerField("보존기간", choices=PRESERVATION_CHOICES, default=5)
    
    # 작성자
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="authored_documents", verbose_name="기안자"
    )
    
    # 읽음 상태
    is_read = models.BooleanField("읽음 여부", default=False)
    
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

    def save(self, *args, **kwargs):
        # 문서번호 자동 생성 (제출 시)
        if self.status == "pending" and not self.document_number:
            today = timezone.now()
            prefix = f"DOC-{today.strftime('%Y%m%d')}"
            last_doc = Document.objects.filter(
                document_number__startswith=prefix
            ).order_by('-document_number').first()
            
            if last_doc and last_doc.document_number:
                last_num = int(last_doc.document_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.document_number = f"{prefix}-{new_num:04d}"
        
        super().save(*args, **kwargs)

    @property
    def current_approver(self):
        """현재 결재 차례인 사람"""
        pending = self.approval_lines.filter(
            status="pending",
            approval_type__in=["approval", "agreement"],
        ).order_by("order").first()
        return pending.approver if pending else None

    @property
    def final_approver(self):
        """최종 결재자"""
        last = self.approval_lines.filter(approval_type="approval").order_by("-order").first()
        return last.approver if last else None

    @property
    def attachment_count(self):
        """첨부파일 수"""
        return self.attachments.count()


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
    is_read = models.BooleanField("열람 여부", default=False)
    read_at = models.DateTimeField("열람일", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "결재선"
        verbose_name_plural = "결재선"
        ordering = ["document", "order"]
        unique_together = [["document", "order"]]

    def __str__(self):
        return f"{self.document.title} - {self.order}. {self.approver}"


class ApprovalLinePreset(models.Model):
    """사용자별 저장 결재선"""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_line_presets",
        verbose_name="소유자",
    )
    name = models.CharField("결재선 이름", max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "결재선 프리셋"
        verbose_name_plural = "결재선 프리셋"
        ordering = ["-updated_at", "-id"]
        unique_together = [["owner", "name"]]

    def __str__(self):
        return f"{self.owner} - {self.name}"


class ApprovalLinePresetItem(models.Model):
    """저장 결재선 항목"""

    preset = models.ForeignKey(
        ApprovalLinePreset,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="결재선 프리셋",
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_line_preset_items",
        verbose_name="결재자",
    )
    order = models.PositiveIntegerField("순서", default=0)
    approval_type = models.CharField(
        "결재 유형",
        max_length=20,
        choices=ApprovalLine.TYPE_CHOICES,
        default="approval",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "결재선 프리셋 항목"
        verbose_name_plural = "결재선 프리셋 항목"
        ordering = ["preset", "order"]
        unique_together = [["preset", "order"]]

    def __str__(self):
        return f"{self.preset.name} - {self.order}. {self.approver}"


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


class Attachment(models.Model):
    """결재 문서 첨부파일"""
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE,
        related_name="attachments", verbose_name="문서"
    )
    file = models.FileField("첨부파일", upload_to="approval/attachments/%Y/%m/")
    filename = models.CharField("원본 파일명", max_length=255)
    file_size = models.PositiveIntegerField("파일 크기(bytes)", default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="uploaded_attachments", verbose_name="업로더"
    )
    uploaded_at = models.DateTimeField("업로드일", auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일"
        ordering = ["uploaded_at"]

    def __str__(self):
        return self.filename
