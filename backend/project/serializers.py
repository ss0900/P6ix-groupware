# backend/project/serializers.py
from rest_framework import serializers
from .models import (
    Project, ProjectMember, Task, TaskWatcher,
    TaskAttachment, TaskComment, ActivityLog,
    TimesheetEntry, WorkDiaryEntry
)


class ProjectMemberSerializer(serializers.ModelSerializer):
    """프로젝트 멤버 Serializer"""
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = ProjectMember
        fields = [
            'id', 'project', 'user', 'user_name', 'user_email',
            'role', 'role_display', 'is_active', 'joined_at'
        ]
        read_only_fields = ['joined_at']

    def get_user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.last_name}{obj.user.first_name}"
            return full_name if full_name.strip() else obj.user.username
        return ""

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ""


class ProjectSerializer(serializers.ModelSerializer):
    """프로젝트 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    members = ProjectMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'code', 'name', 'description',
            'start_date', 'end_date',
            'status', 'status_display', 'progress',
            'is_public', 'is_important',
            'created_by', 'created_by_name',
            'manager', 'manager_name',
            'member_count', 'task_count',
            'members',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.last_name}{obj.created_by.first_name}"
            return full_name if full_name.strip() else obj.created_by.username
        return ""

    def get_manager_name(self, obj):
        if obj.manager:
            full_name = f"{obj.manager.last_name}{obj.manager.first_name}"
            return full_name if full_name.strip() else obj.manager.username
        return ""

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_task_count(self, obj):
        return obj.tasks.filter(is_disabled=False).count()


class ProjectListSerializer(serializers.ModelSerializer):
    """프로젝트 목록용 간단한 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    manager_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'code', 'name',
            'start_date', 'end_date',
            'status', 'status_display', 'progress',
            'is_public', 'is_important',
            'manager', 'manager_name',
            'member_count', 'task_count',
            'updated_at'
        ]

    def get_manager_name(self, obj):
        if obj.manager:
            full_name = f"{obj.manager.last_name}{obj.manager.first_name}"
            return full_name if full_name.strip() else obj.manager.username
        return ""

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_task_count(self, obj):
        return obj.tasks.filter(is_disabled=False).count()


class TaskWatcherSerializer(serializers.ModelSerializer):
    """참조인 Serializer"""
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskWatcher
        fields = ['id', 'task', 'user', 'user_name', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.last_name}{obj.user.first_name}"
            return full_name if full_name.strip() else obj.user.username
        return ""


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """첨부파일 Serializer"""
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'task', 'file', 'file_url', 'original_name', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_at', 'original_name', 'file_size']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            full_name = f"{obj.uploaded_by.last_name}{obj.uploaded_by.first_name}"
            return full_name if full_name.strip() else obj.uploaded_by.username
        return ""

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class TaskCommentSerializer(serializers.ModelSerializer):
    """댓글 Serializer"""
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'author_name',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'author']

    def get_author_name(self, obj):
        if obj.author:
            full_name = f"{obj.author.last_name}{obj.author.first_name}"
            return full_name if full_name.strip() else obj.author.username
        return ""


class TaskSerializer(serializers.ModelSerializer):
    """업무 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True, default="미분류")
    project_code = serializers.CharField(source='project.code', read_only=True, default="")
    manager_name = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    watchers = TaskWatcherSerializer(many=True, read_only=True)
    watcher_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'project_code',
            'title', 'content',
            'manager', 'manager_name',
            'assignee', 'assignee_name',
            'status', 'status_display',
            'priority', 'priority_display',
            'start_date', 'due_date',
            'is_read', 'is_disabled', 'is_important', 'notify_enabled',
            'created_by', 'created_by_name',
            'attachments', 'comments', 'watchers', 'watcher_ids',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_manager_name(self, obj):
        if obj.manager:
            full_name = f"{obj.manager.last_name}{obj.manager.first_name}"
            return full_name if full_name.strip() else obj.manager.username
        return ""

    def get_assignee_name(self, obj):
        if obj.assignee:
            full_name = f"{obj.assignee.last_name}{obj.assignee.first_name}"
            return full_name if full_name.strip() else obj.assignee.username
        return ""

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.last_name}{obj.created_by.first_name}"
            return full_name if full_name.strip() else obj.created_by.username
        return ""

    def create(self, validated_data):
        watcher_ids = validated_data.pop('watcher_ids', [])
        task = super().create(validated_data)
        
        # 참조인 생성
        for user_id in watcher_ids:
            TaskWatcher.objects.create(task=task, user_id=user_id)
        
        return task

    def update(self, instance, validated_data):
        watcher_ids = validated_data.pop('watcher_ids', None)
        task = super().update(instance, validated_data)
        
        # 참조인 업데이트 (제공된 경우만)
        if watcher_ids is not None:
            task.watchers.all().delete()
            for user_id in watcher_ids:
                TaskWatcher.objects.create(task=task, user_id=user_id)
        
        return task


class TaskListSerializer(serializers.ModelSerializer):
    """업무 목록용 간단한 Serializer"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True, default="미분류")
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name',
            'title',
            'assignee', 'assignee_name',
            'status', 'status_display',
            'priority', 'priority_display',
            'start_date', 'due_date',
            'is_read', 'is_disabled', 'is_important',
            'updated_at'
        ]

    def get_assignee_name(self, obj):
        if obj.assignee:
            full_name = f"{obj.assignee.last_name}{obj.assignee.first_name}"
            return full_name if full_name.strip() else obj.assignee.username
        return ""


class ActivityLogSerializer(serializers.ModelSerializer):
    """활동 로그 Serializer"""
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'project', 'task', 'user', 'user_name',
            'action', 'action_display', 'description',
            'created_at'
        ]
        read_only_fields = ['created_at']

    def get_user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.last_name}{obj.user.first_name}"
            return full_name if full_name.strip() else obj.user.username
        return ""


class TimesheetEntrySerializer(serializers.ModelSerializer):
    """타임시트 Serializer"""
    user_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True, default="미분류")
    task_title = serializers.CharField(source='task.title', read_only=True, default="")

    class Meta:
        model = TimesheetEntry
        fields = [
            'id', 'user', 'user_name',
            'project', 'project_name',
            'task', 'task_title',
            'work_date', 'hours', 'memo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.last_name}{obj.user.first_name}"
            return full_name if full_name.strip() else obj.user.username
        return ""


class WorkDiaryEntrySerializer(serializers.ModelSerializer):
    """업무일지 Serializer"""
    user_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True, default="")
    task_title = serializers.CharField(source='task.title', read_only=True, default="")

    class Meta:
        model = WorkDiaryEntry
        fields = [
            'id', 'user', 'user_name',
            'date',
            'project', 'project_name',
            'task', 'task_title',
            'content',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'user']

    def get_user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.last_name}{obj.user.first_name}"
            return full_name if full_name.strip() else obj.user.username
        return ""

