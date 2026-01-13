# backend/board/models.py
from django.db import models
from django.conf import settings


class Board(models.Model):
    """게시판 정의 - 계층적 구조 지원"""
    name = models.CharField("게시판 이름", max_length=100)
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, 
        null=True, blank=True, 
        related_name="sub_boards",
        verbose_name="상위 게시판"
    )
    description = models.TextField("설명", blank=True, null=True)
    
    BOARD_TYPE_CHOICES = (
        ('work', '업무 관련 게시판'),
        ('free', '자유 게시판'),
    )
    board_type = models.CharField(
        "게시판 유형", 
        max_length=10, 
        choices=BOARD_TYPE_CHOICES, 
        default='work'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "게시판"
        verbose_name_plural = "게시판"
        ordering = ['created_at']
        unique_together = ['name']  # 게시판 이름은 고유해야 함

    def __str__(self):
        return self.name


class Post(models.Model):
    """게시글"""
    board = models.ForeignKey(
        Board, on_delete=models.CASCADE, 
        related_name="posts",
        verbose_name="게시판"
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용")
    writer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        verbose_name="작성자"
    )
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "게시글"
        verbose_name_plural = "게시글 목록"
        ordering = ['-created_at']

    def __str__(self):
        return self.title


def post_file_path(instance, filename):
    """게시글 첨부파일 저장 경로"""
    return f"board/{instance.post.id}/{filename}"


class PostFile(models.Model):
    """게시글 첨부파일"""
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, 
        related_name="files",
        verbose_name="게시글"
    )
    file = models.FileField("첨부파일", upload_to=post_file_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일"

    def __str__(self):
        return self.file.name
