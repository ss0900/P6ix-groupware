# backend/resources/models.py
from django.db import models
from django.conf import settings
import os


class Folder(models.Model):
    """폴더"""
    name = models.CharField("폴더명", max_length=100)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE,
        null=True, blank=True, related_name="subfolders", verbose_name="상위 폴더"
    )
    description = models.TextField("설명", blank=True)
    
    # 권한
    is_public = models.BooleanField("공개 여부", default=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="owned_folders", verbose_name="소유자"
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
    file = models.FileField("파일", upload_to=resource_upload_path)
    resource_type = models.CharField("파일 유형", max_length=20, choices=RESOURCE_TYPES, default="file")
    
    # 파일 정보
    file_size = models.BigIntegerField("파일 크기", default=0)
    mime_type = models.CharField("MIME 타입", max_length=100, blank=True)
    
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
        
        # 파일 유형 자동 분류
        if self.file and not self.resource_type:
            ext = os.path.splitext(self.file.name)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
                self.resource_type = 'image'
            elif ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']:
                self.resource_type = 'document'
            elif ext in ['.mp4', '.avi', '.mov', '.wmv', '.mkv']:
                self.resource_type = 'video'
            elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
                self.resource_type = 'archive'
            else:
                self.resource_type = 'file'
        
        super().save(*args, **kwargs)

    @property
    def extension(self):
        return os.path.splitext(self.file.name)[1].lower() if self.file else ""


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

    class Meta:
        verbose_name = "다운로드 이력"
        verbose_name_plural = "다운로드 이력"
        ordering = ["-downloaded_at"]

    def __str__(self):
        return f"{self.user} - {self.resource.name}"
