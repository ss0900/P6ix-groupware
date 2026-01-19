# backend/project/admin.py
from django.contrib import admin
from .models import (
    Project, ProjectMember, Task, TaskWatcher,
    TaskAttachment, TaskComment, ActivityLog,
    TimesheetEntry, WorkDiaryEntry
)


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0
    autocomplete_fields = ['user']


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ['title', 'status', 'priority', 'assignee', 'due_date']
    readonly_fields = ['title']
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'status', 'progress', 'manager', 'is_public', 'updated_at']
    list_filter = ['status', 'is_public', 'is_important']
    search_fields = ['code', 'name', 'description']
    autocomplete_fields = ['created_by', 'manager']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ProjectMemberInline]
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('code', 'name', 'description')
        }),
        ('기간 및 상태', {
            'fields': ('start_date', 'end_date', 'status', 'progress')
        }),
        ('설정', {
            'fields': ('is_public', 'is_important', 'manager')
        }),
        ('시스템', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active']
    search_fields = ['project__name', 'user__username']
    autocomplete_fields = ['project', 'user']


class TaskWatcherInline(admin.TabularInline):
    model = TaskWatcher
    extra = 0
    autocomplete_fields = ['user']


class TaskAttachmentInline(admin.TabularInline):
    model = TaskAttachment
    extra = 0
    readonly_fields = ['original_name', 'file_size', 'uploaded_by', 'uploaded_at']


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0
    readonly_fields = ['author', 'created_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'status', 'priority', 'assignee', 'due_date', 'is_disabled', 'updated_at']
    list_filter = ['status', 'priority', 'is_disabled', 'is_read', 'project']
    search_fields = ['title', 'content', 'project__name']
    autocomplete_fields = ['project', 'manager', 'assignee', 'created_by']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [TaskWatcherInline, TaskAttachmentInline, TaskCommentInline]
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('project', 'title', 'content')
        }),
        ('담당', {
            'fields': ('manager', 'assignee')
        }),
        ('상태 및 우선순위', {
            'fields': ('status', 'priority', 'start_date', 'due_date')
        }),
        ('설정', {
            'fields': ('is_read', 'is_disabled', 'is_important', 'notify_enabled')
        }),
        ('시스템', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskWatcher)
class TaskWatcherAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']
    search_fields = ['task__title', 'user__username']
    autocomplete_fields = ['task', 'user']


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'task', 'file_size', 'uploaded_by', 'uploaded_at']
    search_fields = ['original_name', 'task__title']
    readonly_fields = ['file_size', 'uploaded_at']
    autocomplete_fields = ['task', 'uploaded_by']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'content_preview', 'created_at']
    search_fields = ['task__title', 'content', 'author__username']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['task', 'author']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '내용'


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'project', 'task', 'user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['description', 'project__name', 'task__title', 'user__username']
    readonly_fields = ['project', 'task', 'user', 'action', 'description', 'created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(TimesheetEntry)
class TimesheetEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'project', 'task', 'work_date', 'hours', 'created_at']
    list_filter = ['work_date', 'project']
    search_fields = ['user__username', 'project__name', 'task__title', 'memo']
    autocomplete_fields = ['user', 'project', 'task']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'work_date'


@admin.register(WorkDiaryEntry)
class WorkDiaryEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'project', 'task', 'content_preview', 'created_at']
    list_filter = ['date', 'project']
    search_fields = ['user__username', 'project__name', 'task__title', 'content']
    autocomplete_fields = ['user', 'project', 'task']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '내용'

