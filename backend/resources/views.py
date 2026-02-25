# backend/resources/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse
from django.db.models import Q
from django.utils import timezone

from .models import Folder, FolderPermission, Resource, AttachmentLink, DownloadHistory, ActivityLog
from .serializers import (
    FolderSerializer, FolderTreeSerializer, FolderPermissionSerializer,
    ResourceListSerializer, ResourceDetailSerializer, ResourceUploadSerializer,
    AttachmentLinkSerializer, DownloadHistorySerializer, ActivityLogSerializer,
    TrashItemSerializer
)


def log_activity(user, action, request, resource=None, folder=None, details=None):
    """활동 로그 기록"""
    ActivityLog.objects.create(
        user=user,
        action=action,
        resource=resource,
        folder=folder,
        details=details or {},
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
    )


class FolderViewSet(viewsets.ModelViewSet):
    """폴더 ViewSet"""
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 삭제되지 않은 폴더만 (공개 폴더 + 내가 만든 폴더)
        qs = Folder.objects.filter(
            Q(is_public=True) | Q(owner=user),
            is_deleted=False
        )
        
        # 상위 폴더 필터
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        elif parent_id == '':
            # 루트 폴더만
            qs = qs.filter(parent__isnull=True)
        
        return qs.distinct().select_related('owner')

    def perform_create(self, serializer):
        folder = serializer.save(owner=self.request.user)
        log_activity(self.request.user, 'create_folder', self.request, folder=folder)

    @action(detail=True, methods=['get'])
    def contents(self, request, pk=None):
        """폴더 내용 (하위 폴더 + 파일)"""
        folder = self.get_object()
        
        subfolders = FolderSerializer(
            folder.subfolders.filter(is_deleted=False),
            many=True,
            context={'request': request}
        ).data
        
        resources = ResourceListSerializer(
            folder.resources.filter(is_deleted=False),
            many=True,
            context={'request': request}
        ).data
        
        return Response({
            'folder': FolderSerializer(folder, context={'request': request}).data,
            'subfolders': subfolders,
            'resources': resources,
        })

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """폴더 트리 구조"""
        root_folders = Folder.objects.filter(
            parent__isnull=True,
            is_deleted=False
        ).filter(Q(is_public=True) | Q(owner=request.user))
        
        serializer = FolderTreeSerializer(root_folders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """폴더 이름 변경"""
        folder = self.get_object()
        new_name = request.data.get('name')
        
        if not new_name:
            return Response({'error': '새 이름을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_name = folder.name
        folder.name = new_name
        folder.save(update_fields=['name', 'updated_at'])
        
        log_activity(request.user, 'rename', request, folder=folder, details={
            'old_name': old_name, 'new_name': new_name
        })
        
        return Response(FolderSerializer(folder, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """폴더 이동"""
        folder = self.get_object()
        parent_id = request.data.get('parent')
        
        # 자기 자신으로 이동 방지
        if parent_id and int(parent_id) == folder.id:
            return Response({'error': '자기 자신으로 이동할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_parent = folder.parent
        folder.parent_id = parent_id if parent_id else None
        folder.save(update_fields=['parent', 'updated_at'])
        
        log_activity(request.user, 'move', request, folder=folder, details={
            'old_parent': old_parent.id if old_parent else None,
            'new_parent': parent_id
        })
        
        return Response(FolderSerializer(folder, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        """소프트 삭제 (휴지통으로 이동)"""
        folder = self.get_object()
        folder.soft_delete(request.user)
        
        log_activity(request.user, 'delete', request, folder=folder)
        
        return Response({'message': '휴지통으로 이동되었습니다.'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """복원"""
        folder = Folder.objects.get(pk=pk, is_deleted=True)
        folder.restore()
        
        log_activity(request.user, 'restore', request, folder=folder)
        
        return Response(FolderSerializer(folder, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'])
    def permissions(self, request, pk=None):
        """폴더 권한 관리"""
        folder = self.get_object()
        
        if request.method == 'GET':
            perms = folder.permissions.all()
            serializer = FolderPermissionSerializer(perms, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            data = request.data.copy()
            data['folder'] = folder.id
            serializer = FolderPermissionSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResourceViewSet(viewsets.ModelViewSet):
    """자료 ViewSet"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Resource.objects.filter(is_deleted=False).select_related('folder', 'uploader')
        
        # 폴더 필터
        folder_id = self.request.query_params.get('folder')
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        elif folder_id == '':
            qs = qs.filter(folder__isnull=True)
        
        # 유형 필터
        resource_type = self.request.query_params.get('type')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        
        # 임시파일 필터
        temporary = self.request.query_params.get('temporary')
        if temporary == 'true':
            qs = qs.filter(is_temporary=True)
        elif temporary == 'false':
            qs = qs.filter(is_temporary=False)
        
        # 검색
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(tags__icontains=search) | Q(description__icontains=search)
            )
        
        # 정렬
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['name', '-name', 'file_size', '-file_size', 'created_at', '-created_at']:
            qs = qs.order_by(ordering)
        
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ResourceListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ResourceUploadSerializer
        return ResourceDetailSerializer

    def perform_create(self, serializer):
        resource = serializer.save(uploader=self.request.user)
        log_activity(self.request.user, 'upload', self.request, resource=resource)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """파일 다운로드"""
        resource = self.get_object()
        
        # 다운로드 수 증가
        resource.download_count += 1
        resource.save(update_fields=['download_count'])
        
        # 다운로드 이력 저장
        DownloadHistory.objects.create(
            resource=resource,
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        log_activity(request.user, 'download', request, resource=resource)
        
        # 파일 응답
        response = FileResponse(resource.file.open(), as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{resource.name}"'
        return response

    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """파일 이름 변경"""
        resource = self.get_object()
        new_name = request.data.get('name')
        
        if not new_name:
            return Response({'error': '새 이름을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_name = resource.name
        resource.name = new_name
        resource.save(update_fields=['name', 'updated_at'])
        
        log_activity(request.user, 'rename', request, resource=resource, details={
            'old_name': old_name, 'new_name': new_name
        })
        
        return Response(ResourceDetailSerializer(resource, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """파일 이동"""
        resource = self.get_object()
        folder_id = request.data.get('folder')
        
        old_folder = resource.folder
        resource.folder_id = folder_id if folder_id else None
        resource.save(update_fields=['folder', 'updated_at'])
        
        log_activity(request.user, 'move', request, resource=resource, details={
            'old_folder': old_folder.id if old_folder else None,
            'new_folder': folder_id
        })
        
        return Response(ResourceDetailSerializer(resource, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        """소프트 삭제 (휴지통으로 이동)"""
        resource = self.get_object()
        resource.soft_delete(request.user)
        
        log_activity(request.user, 'delete', request, resource=resource)
        
        return Response({'message': '휴지통으로 이동되었습니다.'})

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """다운로드 이력"""
        resource = self.get_object()
        history = resource.download_history.all()[:50]
        serializer = DownloadHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """최근 업로드된 자료"""
        qs = self.get_queryset()[:10]
        serializer = ResourceListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class TrashViewSet(viewsets.ViewSet):
    """휴지통 ViewSet"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """삭제된 항목 목록"""
        user = request.user
        
        # 삭제된 폴더
        folders = Folder.objects.filter(
            is_deleted=True
        ).filter(Q(owner=user) | Q(deleted_by=user)).select_related('deleted_by', 'owner')
        
        # 삭제된 파일
        resources = Resource.objects.filter(
            is_deleted=True
        ).filter(Q(uploader=user) | Q(deleted_by=user)).select_related('deleted_by', 'uploader')
        
        items = []
        for folder in folders:
            items.append({
                'id': folder.id,
                'name': folder.name,
                'type': 'folder',
                'deleted_at': folder.deleted_at,
                'deleted_by_name': f"{folder.deleted_by.last_name}{folder.deleted_by.first_name}" if folder.deleted_by else "",
                'uploader_name': f"{folder.owner.last_name}{folder.owner.first_name}" if folder.owner else "",
                'created_at': folder.created_at,
            })
        
        for resource in resources:
            items.append({
                'id': resource.id,
                'name': resource.name,
                'type': 'file',
                'deleted_at': resource.deleted_at,
                'deleted_by_name': f"{resource.deleted_by.last_name}{resource.deleted_by.first_name}" if resource.deleted_by else "",
                'uploader_name': f"{resource.uploader.last_name}{resource.uploader.first_name}" if resource.uploader else "",
                'created_at': resource.created_at,
                'size': resource.file_size,
                'resource_type': resource.resource_type,
            })
        
        # 삭제일 기준 정렬
        items.sort(key=lambda x: x['deleted_at'] or timezone.now(), reverse=True)
        
        serializer = TrashItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """복원"""
        item_type = request.data.get('type', 'file')
        
        if item_type == 'folder':
            folder = Folder.objects.get(pk=pk, is_deleted=True)
            folder.restore()
            log_activity(request.user, 'restore', request, folder=folder)
            return Response({'message': '폴더가 복원되었습니다.'})
        else:
            resource = Resource.objects.get(pk=pk, is_deleted=True)
            resource.restore()
            log_activity(request.user, 'restore', request, resource=resource)
            return Response({'message': '파일이 복원되었습니다.'})

    @action(detail=True, methods=['delete'])
    def purge(self, request, pk=None):
        """영구 삭제"""
        item_type = request.data.get('type', 'file')
        
        if item_type == 'folder':
            folder = Folder.objects.get(pk=pk, is_deleted=True)
            folder_name = folder.name
            folder.delete()
            log_activity(request.user, 'purge', request, details={'folder_name': folder_name})
            return Response({'message': '폴더가 영구 삭제되었습니다.'})
        else:
            resource = Resource.objects.get(pk=pk, is_deleted=True)
            resource_name = resource.name
            # 파일도 삭제
            if resource.file:
                resource.file.delete(save=False)
            resource.delete()
            log_activity(request.user, 'purge', request, details={'resource_name': resource_name})
            return Response({'message': '파일이 영구 삭제되었습니다.'})


class AttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """첨부파일 허브 ViewSet"""
    serializer_class = AttachmentLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AttachmentLink.objects.select_related('document', 'created_by')
        
        # 출처 유형 필터
        source_type = self.request.query_params.get('source_type')
        if source_type:
            qs = qs.filter(source_type=source_type)
        
        # 출처 ID 필터
        source_id = self.request.query_params.get('source_id')
        if source_id:
            qs = qs.filter(source_id=source_id)
        
        return qs

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """내가 첨부한 파일들"""
        attachments = self.get_queryset().filter(created_by=request.user)
        serializer = self.get_serializer(attachments, many=True)
        return Response(serializer.data)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """활동 로그 ViewSet"""
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ActivityLog.objects.select_related('resource', 'folder', 'user')
        
        # 액션 필터
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        
        # 사용자 필터
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        # 기간 필터
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        
        return qs[:100]  # 최근 100개만
