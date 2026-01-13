# backend/board/admin.py
from django.contrib import admin
from .models import Board, Post, PostFile


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'parent', 'board_type', 'created_at']
    list_filter = ['board_type']
    search_fields = ['name', 'description']


class PostFileInline(admin.TabularInline):
    model = PostFile
    extra = 0


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'board', 'writer', 'created_at', 'updated_at']
    list_filter = ['board', 'created_at']
    search_fields = ['title', 'content']
    inlines = [PostFileInline]


@admin.register(PostFile)
class PostFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'post', 'file', 'created_at']
    list_filter = ['created_at']
