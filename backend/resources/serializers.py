# backend/resources/serializers.py
from rest_framework import serializers
from .models import Folder, Resource, DownloadHistory


class FolderSerializer(serializers.ModelSerializer):
    subfolder_count = serializers.SerializerMethodField()
    resource_count = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    path = serializers.ReadOnlyField()

    class Meta:
        model = Folder
        fields = [
            "id", "name", "parent", "description", "path",
            "is_public", "owner", "owner_name",
            "subfolder_count", "resource_count",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "owner"]

    def get_subfolder_count(self, obj):
        return obj.subfolders.count()

    def get_resource_count(self, obj):
        return obj.resources.count()

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""


class ResourceListSerializer(serializers.ModelSerializer):
    """자료 목록용"""
    uploader_name = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source="folder.name", read_only=True)
    file_url = serializers.SerializerMethodField()
    extension = serializers.ReadOnlyField()

    class Meta:
        model = Resource
        fields = [
            "id", "name", "folder", "folder_name",
            "resource_type", "file_size", "extension", "file_url",
            "download_count", "view_count",
            "uploader", "uploader_name",
            "created_at"
        ]

    def get_uploader_name(self, obj):
        return f"{obj.uploader.last_name}{obj.uploader.first_name}" if obj.uploader else ""

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ResourceDetailSerializer(serializers.ModelSerializer):
    """자료 상세용"""
    uploader_name = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source="folder.name", read_only=True)
    file_url = serializers.SerializerMethodField()
    extension = serializers.ReadOnlyField()

    class Meta:
        model = Resource
        fields = [
            "id", "name", "folder", "folder_name",
            "file", "file_url", "resource_type", "file_size", "mime_type", "extension",
            "description", "tags",
            "download_count", "view_count",
            "uploader", "uploader_name",
            "created_at", "updated_at"
        ]

    def get_uploader_name(self, obj):
        return f"{obj.uploader.last_name}{obj.uploader.first_name}" if obj.uploader else ""

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ResourceUploadSerializer(serializers.ModelSerializer):
    """자료 업로드용"""
    class Meta:
        model = Resource
        fields = ["id", "name", "folder", "file", "description", "tags"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        # 파일명 자동 설정
        if not validated_data.get("name") and validated_data.get("file"):
            validated_data["name"] = validated_data["file"].name
        return super().create(validated_data)


class DownloadHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    resource_name = serializers.CharField(source="resource.name", read_only=True)

    class Meta:
        model = DownloadHistory
        fields = ["id", "resource", "resource_name", "user", "user_name", "downloaded_at", "ip_address"]
        read_only_fields = ["id", "downloaded_at"]

    def get_user_name(self, obj):
        return f"{obj.user.last_name}{obj.user.first_name}" if obj.user else ""
