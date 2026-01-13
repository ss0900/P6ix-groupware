# backend/contact/models.py
from django.db import models
from django.conf import settings


class Message(models.Model):
    """업무연락 메시지"""
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="contact_sent_messages", verbose_name="발신자"
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용")
    
    # 상태
    is_draft = models.BooleanField("임시저장", default=False)
    is_to_self = models.BooleanField("내게 쓴 글", default=False)
    is_starred = models.BooleanField("중요 표시", default=False)
    is_deleted = models.BooleanField("삭제됨", default=False)
    
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "업무연락"
        verbose_name_plural = "업무연락"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"[{self.sender}] {self.title}"

    @property
    def read_count(self):
        """읽은 수신자 수"""
        return self.recipients.filter(is_read=True).count()

    @property
    def total_recipients(self):
        """전체 수신자 수"""
        return self.recipients.count()

    @property
    def read_status(self):
        """읽음 상태 (예: 39/44)"""
        return f"{self.read_count}/{self.total_recipients}"


class Recipient(models.Model):
    """수신자"""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE,
        related_name="recipients", verbose_name="메시지"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="received_messages", verbose_name="수신자"
    )
    is_read = models.BooleanField("읽음", default=False)
    read_at = models.DateTimeField("읽은 시간", null=True, blank=True)
    is_starred = models.BooleanField("중요 표시", default=False)
    is_deleted = models.BooleanField("삭제됨", default=False)

    class Meta:
        verbose_name = "수신자"
        verbose_name_plural = "수신자"
        unique_together = ["message", "recipient"]

    def __str__(self):
        status = "읽음" if self.is_read else "안읽음"
        return f"{self.recipient} - {status}"


class Comment(models.Model):
    """댓글"""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE,
        related_name="comments", verbose_name="메시지"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="contact_comments", verbose_name="작성자"
    )
    content = models.TextField("내용")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "댓글"
        verbose_name_plural = "댓글"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author}: {self.content[:30]}"


class Attachment(models.Model):
    """첨부파일"""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE,
        related_name="attachments", verbose_name="메시지"
    )
    file = models.FileField("파일", upload_to="contact/attachments/%Y/%m/")
    original_name = models.CharField("원본 파일명", max_length=255)
    file_size = models.PositiveIntegerField("파일 크기", default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일"

    def __str__(self):
        return self.original_name
