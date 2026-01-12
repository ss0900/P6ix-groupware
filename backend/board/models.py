# backend/board/models.py
from django.db import models
from django.conf import settings


class Board(models.Model):
    """게시판 정의"""
    BOARD_TYPES = [
        ("notice", "공지사항"),
        ("general", "일반 게시판"),
        ("qna", "Q&A"),
        ("archive", "자료실"),
    ]

    name = models.CharField("게시판 이름", max_length=100)
    slug = models.SlugField("슬러그", unique=True, max_length=50)
    board_type = models.CharField("게시판 유형", max_length=20, choices=BOARD_TYPES, default="general")
    description = models.TextField("설명", blank=True)
    is_active = models.BooleanField("활성화", default=True)
    
    # 권한
    can_write_all = models.BooleanField("전체 쓰기 가능", default=True)
    can_comment = models.BooleanField("댓글 허용", default=True)
    can_attach = models.BooleanField("첨부파일 허용", default=True)
    
    order = models.PositiveIntegerField("정렬 순서", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "게시판"
        verbose_name_plural = "게시판"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Post(models.Model):
    """게시글"""
    board = models.ForeignKey(
        Board, on_delete=models.CASCADE,
        related_name="posts", verbose_name="게시판"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="posts", verbose_name="작성자"
    )
    
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용")
    
    # 메타
    is_notice = models.BooleanField("공지 고정", default=False)
    is_secret = models.BooleanField("비밀글", default=False)
    view_count = models.PositiveIntegerField("조회수", default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "게시글"
        verbose_name_plural = "게시글"
        ordering = ["-is_notice", "-created_at"]

    def __str__(self):
        return f"[{self.board.name}] {self.title}"


class Comment(models.Model):
    """댓글"""
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE,
        related_name="comments", verbose_name="게시글"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="comments", verbose_name="작성자"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE,
        null=True, blank=True, related_name="replies", verbose_name="상위 댓글"
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
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE,
        related_name="attachments", verbose_name="게시글"
    )
    file = models.FileField("파일", upload_to="board/attachments/%Y/%m/")
    original_name = models.CharField("원본 파일명", max_length=255)
    file_size = models.PositiveIntegerField("파일 크기", default=0)
    download_count = models.PositiveIntegerField("다운로드 수", default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일"

    def __str__(self):
        return self.original_name
