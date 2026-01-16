# backend/resources/serializers.py
from rest_framework import serializers
from .models import Folder, FolderPermission, Resource, AttachmentLink, DownloadHistory, ActivityLog
from .utils import validate_file, calculate_checksum, FileValidationError


class FolderPermissionSerializer(serializers.ModelSerializer):
    """폴더 권한 Serializer"""
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = FolderPermission
        fields = ['id', 'folder', 'user', 'user_name', 'department', 'permission', 'inherit']
        read_only_fields = ['id']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.last_name}{obj.user.first_name}"
        return None


class FolderSerializer(serializers.ModelSerializer):
    """폴더 Serializer"""
    subfolder_count = serializers.SerializerMethodField()
    resource_count = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    path = serializers.ReadOnlyField()
    permissions = FolderPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parent', 'description', 'path',
            'is_public', 'owner_scope', 'owner', 'owner_name',
            'is_deleted', 'deleted_at', 'deleted_by',
            'subfolder_count', 'resource_count', 'permissions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner', 'is_deleted', 'deleted_at', 'deleted_by']

    def get_subfolder_count(self, obj):
        return obj.subfolders.filter(is_deleted=False).count()

    def get_resource_count(self, obj):
        return obj.resources.filter(is_deleted=False).count()

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""


class FolderTreeSerializer(serializers.ModelSerializer):
    """폴더 트리 Serializer (재귀)"""
    children = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'children']

    def get_children(self, obj):
        children = obj.subfolders.filter(is_deleted=False)
        return FolderTreeSerializer(children, many=True).data


class ResourceListSerializer(serializers.ModelSerializer):
    """자료 목록용"""
    uploader_name = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    extension = serializers.ReadOnlyField()

    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'original_name', 'folder', 'folder_name',
            'resource_type', 'file_size', 'extension', 'file_url',
            'download_count', 'view_count',
            'uploader', 'uploader_name',
            'version', 'is_deleted', 'is_temporary',
            'created_at'
        ]

    def get_uploader_name(self, obj):
        return f"{obj.uploader.last_name}{obj.uploader.first_name}" if obj.uploader else ""

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ResourceDetailSerializer(serializers.ModelSerializer):
    """자료 상세용"""
    uploader_name = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    extension = serializers.ReadOnlyField()
    previous_versions = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'original_name', 'folder', 'folder_name',
            'file', 'file_url', 'resource_type', 'file_size', 'mime_type', 'checksum', 'extension',
            'description', 'tags',
            'download_count', 'view_count',
            'uploader', 'uploader_name',
            'version', 'previous_version', 'previous_versions',
            'is_deleted', 'deleted_at', 'is_temporary', 'expires_at',
            'created_at', 'updated_at'
        ]

    def get_uploader_name(self, obj):
        return f"{obj.uploader.last_name}{obj.uploader.first_name}" if obj.uploader else ""

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_previous_versions(self, obj):
        """이전 버전들 목록"""
        versions = []
        current = obj.previous_version
        while current:
            versions.append({
                'id': current.id,
                'name': current.name,
                'version': current.version,
                'created_at': current.created_at,
            })
            current = current.previous_version
        return versions


class ResourceUploadSerializer(serializers.ModelSerializer):
    """자료 업로드용"""
    class Meta:
        model = Resource
        fields = ['id', 'name', 'folder', 'file', 'description', 'tags', 'is_temporary', 'expires_at']
        read_only_fields = ['id']

    def validate_file(self, value):
        """파일 검증"""
        try:
            validate_file(value, value.name)
        except FileValidationError as e:
            raise serializers.ValidationError(str(e))
        return value

    def create(self, validated_data):
        # 파일명 자동 설정
        if not validated_data.get('name') and validated_data.get('file'):
            validated_data['name'] = validated_data['file'].name
        
        # 원본 파일명 저장
        if validated_data.get('file'):
            validated_data['original_name'] = validated_data['file'].name
        
        instance = super().create(validated_data)
        
        # 체크섬 계산
        if instance.file:
            instance.checksum = calculate_checksum(instance.file)
            instance.save(update_fields=['checksum'])
        
        return instance


class AttachmentLinkSerializer(serializers.ModelSerializer):
    """첨부파일 연결 Serializer"""
    document_name = serializers.CharField(source='document.name', read_only=True)
    document_size = serializers.IntegerField(source='document.file_size', read_only=True)
    document_type = serializers.CharField(source='document.resource_type', read_only=True)
    document_url = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AttachmentLink
        fields = [
            'id', 'source_type', 'source_id', 'source_title',
            'document', 'document_name', 'document_size', 'document_type', 'document_url',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_document_url(self, obj):
        request = self.context.get('request')
        if obj.document.file and request:
            return request.build_absolute_uri(obj.document.file.url)
        return None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class DownloadHistorySerializer(serializers.ModelSerializer):
    """다운로드 이력 Serializer"""
    user_name = serializers.SerializerMethodField()
    resource_name = serializers.CharField(source='resource.name', read_only=True)

    class Meta:
        model = DownloadHistory
        fields = ['id', 'resource', 'resource_name', 'user', 'user_name', 'downloaded_at', 'ip_address', 'user_agent']
        read_only_fields = ['id', 'downloaded_at']

    def get_user_name(self, obj):
        return f"{obj.user.last_name}{obj.user.first_name}" if obj.user else ""


class ActivityLogSerializer(serializers.ModelSerializer):
    """활동 로그 Serializer"""
    user_name = serializers.SerializerMethodField()
    resource_name = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'resource', 'resource_name', 'folder', 'folder_name',
            'user', 'user_name', 'action', 'details',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        return f"{obj.user.last_name}{obj.user.first_name}" if obj.user else ""

    def get_resource_name(self, obj):
        return obj.resource.name if obj.resource else None

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else None


class TrashItemSerializer(serializers.Serializer):
    """휴지통 항목 Serializer"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.CharField()  # 'folder' or 'file'
    deleted_at = serializers.DateTimeField()
    deleted_by_name = serializers.CharField()
    size = serializers.IntegerField(required=False)
    resource_type = serializers.CharField(required=False)
