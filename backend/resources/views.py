# backend/resources/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from django.db.models import Q

from .models import Folder, Resource, DownloadHistory
from .serializers import (
    FolderSerializer,
    ResourceListSerializer, ResourceDetailSerializer, ResourceUploadSerializer,
    DownloadHistorySerializer
)


class FolderViewSet(viewsets.ModelViewSet):
    """폴더 ViewSet"""
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 공개 폴더 + 내가 만든 폴더
        qs = Folder.objects.filter(Q(is_public=True) | Q(owner=user))
        
        # 상위 폴더 필터
        parent_id = self.request.query_params.get("parent")
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        elif parent_id == "":
            # 루트 폴더만
            qs = qs.filter(parent__isnull=True)
        
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def contents(self, request, pk=None):
        """폴더 내용 (하위 폴더 + 파일)"""
        folder = self.get_object()
        
        subfolders = FolderSerializer(
            folder.subfolders.all(), many=True, context={"request": request}
        ).data
        
        resources = ResourceListSerializer(
            folder.resources.all(), many=True, context={"request": request}
        ).data
        
        return Response({
            "folder": FolderSerializer(folder, context={"request": request}).data,
            "subfolders": subfolders,
            "resources": resources,
        })


class ResourceViewSet(viewsets.ModelViewSet):
    """자료 ViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Resource.objects.select_related("folder", "uploader")
        
        # 폴더 필터
        folder_id = self.request.query_params.get("folder")
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        elif folder_id == "":
            qs = qs.filter(folder__isnull=True)
        
        # 유형 필터
        resource_type = self.request.query_params.get("type")
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        
        # 검색
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(tags__icontains=search)
            )
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ResourceListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ResourceUploadSerializer
        return ResourceDetailSerializer

    def perform_create(self, serializer):
        serializer.save(uploader=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # 조회수 증가
        instance.view_count += 1
        instance.save(update_fields=["view_count"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """파일 다운로드"""
        resource = self.get_object()
        
        # 다운로드 수 증가
        resource.download_count += 1
        resource.save(update_fields=["download_count"])
        
        # 다운로드 이력 저장
        DownloadHistory.objects.create(
            resource=resource,
            user=request.user,
            ip_address=request.META.get("REMOTE_ADDR")
        )
        
        # 파일 응답
        response = FileResponse(resource.file.open(), as_attachment=True)
        response["Content-Disposition"] = f'attachment; filename="{resource.name}"'
        return response

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """다운로드 이력"""
        resource = self.get_object()
        history = resource.download_history.all()[:50]
        serializer = DownloadHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """최근 업로드된 자료"""
        qs = self.get_queryset()[:10]
        serializer = ResourceListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)
