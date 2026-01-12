# backend/chat/models.py
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """1:1 또는 그룹 대화방"""
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations',
        verbose_name="참여자"
    )
    is_group = models.BooleanField("그룹 채팅", default=False)
    name = models.CharField("대화방 이름", max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "대화방"
        verbose_name_plural = "대화방"
        ordering = ["-updated_at"]

    def __str__(self):
        if self.is_group and self.name:
            return self.name
        return f"대화방 {self.id}"


class Message(models.Model):
    """채팅 메시지"""
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, 
        related_name='messages', verbose_name="대화방"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
        related_name='sent_messages', verbose_name="발신자"
    )
    text = models.TextField("메시지 내용")
    is_read = models.BooleanField("읽음 여부", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "메시지"
        verbose_name_plural = "메시지"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender}: {self.text[:30]}"


class Notification(models.Model):
    """알림"""
    NOTIFICATION_TYPES = [
        ("system", "시스템"),
        ("notice", "공지사항"),
        ("approval", "결재"),
        ("schedule", "일정"),
        ("message", "메시지"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications', verbose_name="사용자"
    )
    notification_type = models.CharField("알림 유형", max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField("제목", max_length=200)
    message = models.TextField("내용")
    link = models.CharField("링크", max_length=500, blank=True)
    
    is_read = models.BooleanField("읽음 여부", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "알림"
        verbose_name_plural = "알림"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.title}"


class HelpQuestion(models.Model):
    """도움말/FAQ 질문"""
    STATUS_CHOICES = [
        ("pending", "답변대기"),
        ("answered", "답변완료"),
    ]

    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='help_questions', verbose_name="작성자"
    )
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="pending")
    answer = models.TextField("답변", blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField("답변일", null=True, blank=True)

    class Meta:
        verbose_name = "도움말 질문"
        verbose_name_plural = "도움말 질문"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
