# backend/board/admin.py
from django.contrib import admin
from .models import Board, Post, Comment, Attachment


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "board_type", "is_active", "order"]
    list_filter = ["board_type", "is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    raw_id_fields = ["author", "parent"]


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "board", "author", "is_notice", "view_count", "created_at"]
    list_filter = ["board", "is_notice", "is_secret"]
    search_fields = ["title", "content", "author__username"]
    raw_id_fields = ["author", "board"]
    inlines = [AttachmentInline, CommentInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["post", "author", "content", "created_at"]
    raw_id_fields = ["post", "author", "parent"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["original_name", "post", "file_size", "download_count", "uploaded_at"]
    raw_id_fields = ["post"]
