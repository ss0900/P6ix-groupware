# backend/resources/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
import os
import hashlib


class Folder(models.Model):
    """폴더"""
    SCOPE_CHOICES = [
        ('personal', '개인'),
        ('team', '팀'),
        ('department', '부서'),
        ('company', '전사'),
    ]

    name = models.CharField("폴더명", max_length=100)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE,
        null=True, blank=True, related_name="subfolders", verbose_name="상위 폴더"
    )
    description = models.TextField("설명", blank=True)
    
    # 권한/범위
    is_public = models.BooleanField("공개 여부", default=True)
    owner_scope = models.CharField(
        "소유 범위", max_length=20, choices=SCOPE_CHOICES, default='personal'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="owned_folders", verbose_name="소유자"
    )
    
    # 소프트 삭제
    is_deleted = models.BooleanField("삭제됨", default=False)
    deleted_at = models.DateTimeField("삭제일", null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="deleted_folders", verbose_name="삭제자"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "폴더"
        verbose_name_plural = "폴더"
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def path(self):
        """전체 경로"""
        if self.parent:
            return f"{self.parent.path}/{self.name}"
        return self.name

    def soft_delete(self, user):
        """소프트 삭제"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save()
        # 하위 폴더와 파일도 삭제
        for subfolder in self.subfolders.filter(is_deleted=False):
            subfolder.soft_delete(user)
        for resource in self.resources.filter(is_deleted=False):
            resource.soft_delete(user)

    def restore(self):
        """복원"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save()


class FolderPermission(models.Model):
    """폴더 권한 (ACL)"""
    PERMISSION_CHOICES = [
        ('read', '읽기'),
        ('write', '쓰기'),
        ('delete', '삭제'),
        ('admin', '관리'),
    ]

    folder = models.ForeignKey(
        Folder, on_delete=models.CASCADE, related_name="permissions", verbose_name="폴더"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name="folder_permissions", verbose_name="사용자"
    )
    department = models.CharField("부서", max_length=100, blank=True)
    permission = models.CharField("권한", max_length=20, choices=PERMISSION_CHOICES)
    inherit = models.BooleanField("상속", default=True, help_text="하위 폴더에 권한 상속")

    class Meta:
        verbose_name = "폴더 권한"
        verbose_name_plural = "폴더 권한"
        unique_together = [("folder", "user", "permission")]

    def __str__(self):
        target = self.user or self.department or "전체"
        return f"{self.folder.name} - {target} ({self.get_permission_display()})"


def resource_upload_path(instance, filename):
    """파일 업로드 경로"""
    return f"resources/{instance.folder_id or 'root'}/{filename}"


class Resource(models.Model):
    """자료 (파일)"""
    RESOURCE_TYPES = [
        ("file", "파일"),
        ("image", "이미지"),
        ("document", "문서"),
        ("video", "동영상"),
        ("archive", "압축파일"),
        ("other", "기타"),
    ]

    folder = models.ForeignKey(
        Folder, on_delete=models.CASCADE,
        null=True, blank=True, related_name="resources", verbose_name="폴더"
    )
    name = models.CharField("파일명", max_length=255)
    original_name = models.CharField("원본 파일명", max_length=255, blank=True)
    file = models.FileField("파일", upload_to=resource_upload_path)
    resource_type = models.CharField("파일 유형", max_length=20, choices=RESOURCE_TYPES, default="file")
    
    # 파일 정보
    file_size = models.BigIntegerField("파일 크기", default=0)
    mime_type = models.CharField("MIME 타입", max_length=100, blank=True)
    checksum = models.CharField("체크섬", max_length=64, blank=True, help_text="SHA256 해시")
    
    # 메타데이터
    description = models.TextField("설명", blank=True)
    tags = models.CharField("태그", max_length=200, blank=True, help_text="쉼표로 구분")
    
    # 통계
    download_count = models.PositiveIntegerField("다운로드 수", default=0)
    view_count = models.PositiveIntegerField("조회 수", default=0)
    
    # 소유자
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="uploaded_resources", verbose_name="업로더"
    )
    
    # 버전 관리
    version = models.PositiveIntegerField("버전", default=1)
    previous_version = models.ForeignKey(
        "self", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="newer_versions", verbose_name="이전 버전"
    )
    
    # 소프트 삭제
    is_deleted = models.BooleanField("삭제됨", default=False)
    deleted_at = models.DateTimeField("삭제일", null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="deleted_resources", verbose_name="삭제자"
    )
    
    # 임시 파일
    is_temporary = models.BooleanField("임시파일", default=False)
    expires_at = models.DateTimeField("만료일", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "자료"
        verbose_name_plural = "자료"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # 파일 크기 자동 저장
        if self.file and not self.file_size:
            self.file_size = self.file.size
        
        # 원본 파일명 저장
        if self.file and not self.original_name:
            self.original_name = self.file.name
        
        # 파일 유형 자동 분류
        if self.file and self.resource_type == "file":
            ext = os.path.splitext(self.file.name)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']:
                self.resource_type = 'image'
            elif ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.hwp']:
                self.resource_type = 'document'
            elif ext in ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm']:
                self.resource_type = 'video'
            elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
                self.resource_type = 'archive'
        
        super().save(*args, **kwargs)

    def calculate_checksum(self):
        """SHA256 해시 계산"""
        if self.file:
            sha256 = hashlib.sha256()
            for chunk in self.file.chunks():
                sha256.update(chunk)
            self.checksum = sha256.hexdigest()
            self.save(update_fields=['checksum'])

    def soft_delete(self, user):
        """소프트 삭제"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save()

    def restore(self):
        """복원"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save()

    @property
    def extension(self):
        return os.path.splitext(self.file.name)[1].lower() if self.file else ""


class AttachmentLink(models.Model):
    """첨부파일 허브 (다른 모듈에서 첨부한 파일 연결)"""
    SOURCE_TYPE_CHOICES = [
        ('contact', '업무연락'),
        ('board', '게시판'),
        ('approval', '전자결재'),
        ('chat', '메신저'),
        ('meeting', '회의'),
    ]

    source_type = models.CharField("출처 유형", max_length=20, choices=SOURCE_TYPE_CHOICES)
    source_id = models.PositiveIntegerField("출처 ID")
    source_title = models.CharField("출처 제목", max_length=200, blank=True)
    document = models.ForeignKey(
        Resource, on_delete=models.CASCADE, related_name="attachment_links", verbose_name="문서"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="attachment_links", verbose_name="생성자"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일 연결"
        verbose_name_plural = "첨부파일 연결"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['source_type', 'source_id']),
        ]

    def __str__(self):
        return f"{self.get_source_type_display()} - {self.document.name}"


class DownloadHistory(models.Model):
    """다운로드 이력"""
    resource = models.ForeignKey(
        Resource, on_delete=models.CASCADE,
        related_name="download_history", verbose_name="자료"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="download_history", verbose_name="사용자"
    )
    downloaded_at = models.DateTimeField("다운로드 시간", auto_now_add=True)
    ip_address = models.GenericIPAddressField("IP 주소", null=True, blank=True)
    user_agent = models.TextField("User Agent", blank=True)

    class Meta:
        verbose_name = "다운로드 이력"
        verbose_name_plural = "다운로드 이력"
        ordering = ["-downloaded_at"]

    def __str__(self):
        return f"{self.user} - {self.resource.name}"


class ActivityLog(models.Model):
    """활동 로그 (감사 추적)"""
    ACTION_CHOICES = [
        ('upload', '업로드'),
        ('download', '다운로드'),
        ('preview', '미리보기'),
        ('move', '이동'),
        ('rename', '이름변경'),
        ('delete', '삭제'),
        ('restore', '복원'),
        ('purge', '영구삭제'),
        ('create_folder', '폴더생성'),
    ]

    resource = models.ForeignKey(
        Resource, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="activity_logs", verbose_name="자료"
    )
    folder = models.ForeignKey(
        Folder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="activity_logs", verbose_name="폴더"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="resource_activity_logs", verbose_name="사용자"
    )
    action = models.CharField("액션", max_length=20, choices=ACTION_CHOICES)
    details = models.JSONField("상세정보", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("IP 주소", null=True, blank=True)
    user_agent = models.TextField("User Agent", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "활동 로그"
        verbose_name_plural = "활동 로그"
        ordering = ["-created_at"]

    def __str__(self):
        target = self.resource or self.folder
        return f"{self.user} - {self.get_action_display()} - {target}"
