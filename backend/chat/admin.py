# backend/chat/admin.py
from django.contrib import admin
from .models import Conversation, Message, Notification, HelpQuestion


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'is_group', 'name', 'updated_at']
    list_filter = ['is_group']
    filter_horizontal = ['participants']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'text', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    raw_id_fields = ['conversation', 'sender']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['title', 'message']
    raw_id_fields = ['user']


@admin.register(HelpQuestion)
class HelpQuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'author', 'status', 'created_at', 'answered_at']
    list_filter = ['status']
    search_fields = ['title', 'content']
    raw_id_fields = ['author']
