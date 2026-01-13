# backend/contact/admin.py
from django.contrib import admin
from .models import Message, Recipient, Comment, Attachment


class RecipientInline(admin.TabularInline):
    model = Recipient
    extra = 0
    readonly_fields = ["read_at"]


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "sender", "is_draft", "is_to_self", "is_starred", "is_deleted", "created_at"]
    list_filter = ["is_draft", "is_to_self", "is_starred", "is_deleted"]
    search_fields = ["title", "content", "sender__username", "sender__first_name", "sender__last_name"]
    inlines = [RecipientInline, AttachmentInline, CommentInline]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Recipient)
class RecipientAdmin(admin.ModelAdmin):
    list_display = ["id", "message", "recipient", "is_read", "read_at", "is_starred", "is_deleted"]
    list_filter = ["is_read", "is_starred", "is_deleted"]
    search_fields = ["recipient__username", "recipient__first_name", "message__title"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["id", "message", "author", "content", "created_at"]
    search_fields = ["content", "author__username", "message__title"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["id", "message", "original_name", "file_size", "uploaded_at"]
    search_fields = ["original_name", "message__title"]
