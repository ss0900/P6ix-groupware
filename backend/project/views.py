# backend/project/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta

from .models import (
    Project, ProjectMember, Task, TaskWatcher,
    TaskAttachment, TaskComment, ActivityLog,
    TimesheetEntry, WorkDiaryEntry
)
from .serializers import (
    ProjectSerializer, ProjectListSerializer, ProjectMemberSerializer,
    TaskSerializer, TaskListSerializer,
    TaskAttachmentSerializer, TaskCommentSerializer,
    ActivityLogSerializer,
    TimesheetEntrySerializer, WorkDiaryEntrySerializer
)


class ProjectViewSet(viewsets.ModelViewSet):
    """프로젝트 ViewSet"""
    queryset = Project.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # 상태 필터
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 공개 여부 필터
        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')

        # 중요 표시 필터
        is_important = self.request.query_params.get('is_important')
        if is_important is not None:
            queryset = queryset.filter(is_important=is_important.lower() == 'true')

        # 내 소속 프로젝트만 (my_projects)
        my_projects = self.request.query_params.get('my_projects')
        if my_projects and my_projects.lower() == 'true':
            queryset = queryset.filter(
                Q(members__user=user, members__is_active=True) |
                Q(manager=user) |
                Q(created_by=user)
            ).distinct()

        # 검색
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )

        # 정렬
        ordering = self.request.query_params.get('ordering', '-updated_at')
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        
        # 생성자를 관리자 멤버로 자동 추가
        ProjectMember.objects.create(
            project=project,
            user=self.request.user,
            role=ProjectMember.ROLE_ADMIN
        )
        
        # 활동 로그 생성
        ActivityLog.objects.create(
            project=project,
            user=self.request.user,
            action='created',
            description=f'프로젝트 "{project.name}"이(가) 생성되었습니다.'
        )

    def perform_update(self, serializer):
        project = serializer.save()
        
        # 활동 로그 생성
        ActivityLog.objects.create(
            project=project,
            user=self.request.user,
            action='updated',
            description=f'프로젝트 "{project.name}"이(가) 수정되었습니다.'
        )

    @action(detail=True, methods=['get', 'post', 'delete'], url_path='members')
    def members(self, request, pk=None):
        """프로젝트 멤버 관리"""
        project = self.get_object()

        if request.method == 'GET':
            members = project.members.filter(is_active=True)
            serializer = ProjectMemberSerializer(members, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            user_id = request.data.get('user_id')
            role = request.data.get('role', ProjectMember.ROLE_MEMBER)
            
            if not user_id:
                return Response(
                    {'error': 'user_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            member, created = ProjectMember.objects.update_or_create(
                project=project,
                user_id=user_id,
                defaults={'role': role, 'is_active': True}
            )
            
            if created:
                ActivityLog.objects.create(
                    project=project,
                    user=request.user,
                    action='member_added',
                    description=f'팀원이 추가되었습니다.'
                )

            serializer = ProjectMemberSerializer(member)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        elif request.method == 'DELETE':
            user_id = request.data.get('user_id')
            if not user_id:
                return Response(
                    {'error': 'user_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                member = project.members.get(user_id=user_id)
                member.is_active = False
                member.save()
                
                ActivityLog.objects.create(
                    project=project,
                    user=request.user,
                    action='member_removed',
                    description=f'팀원이 제거되었습니다.'
                )
                
                return Response(status=status.HTTP_204_NO_CONTENT)
            except ProjectMember.DoesNotExist:
                return Response(
                    {'error': 'Member not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

    @action(detail=True, methods=['get'], url_path='activities')
    def activities(self, request, pk=None):
        """프로젝트 활동 로그"""
        project = self.get_object()
        logs = project.activity_logs.all()[:50]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    """업무 ViewSet"""
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # 프로젝트 필터
        project_id = self.request.query_params.get('project_id')
        if project_id:
            if project_id == 'null' or project_id == 'unassigned':
                queryset = queryset.filter(project__isnull=True)
            else:
                queryset = queryset.filter(project_id=project_id)

        # 상태 필터
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 우선순위 필터
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        # 담당자 필터
        assignee = self.request.query_params.get('assignee')
        if assignee:
            if assignee == 'me':
                queryset = queryset.filter(assignee=user)
            else:
                queryset = queryset.filter(assignee_id=assignee)

        # 사용중지 포함 여부
        include_disabled = self.request.query_params.get('include_disabled')
        if not include_disabled or include_disabled.lower() != 'true':
            queryset = queryset.filter(is_disabled=False)

        # 읽음 여부 필터
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # 검색
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )

        # 정렬
        ordering = self.request.query_params.get('ordering', '-updated_at')
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        
        # 첨부파일 처리
        files = self.request.FILES.getlist('files')
        for f in files:
            TaskAttachment.objects.create(
                task=task,
                file=f,
                original_name=f.name,
                file_size=f.size,
                uploaded_by=self.request.user
            )
        
        # 활동 로그 생성
        ActivityLog.objects.create(
            project=task.project,
            task=task,
            user=self.request.user,
            action='created',
            description=f'업무 "{task.title}"이(가) 생성되었습니다.'
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        task = serializer.save()
        
        # 새 첨부파일 처리
        files = self.request.FILES.getlist('files')
        for f in files:
            TaskAttachment.objects.create(
                task=task,
                file=f,
                original_name=f.name,
                file_size=f.size,
                uploaded_by=self.request.user
            )
        
        # 상태 변경 로그
        if task.status != old_status:
            ActivityLog.objects.create(
                project=task.project,
                task=task,
                user=self.request.user,
                action='status_changed',
                description=f'상태가 "{task.get_status_display()}"(으)로 변경되었습니다.'
            )
        else:
            ActivityLog.objects.create(
                project=task.project,
                task=task,
                user=self.request.user,
                action='updated',
                description=f'업무가 수정되었습니다.'
            )

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_action(self, request):
        """업무 일괄 처리"""
        task_ids = request.data.get('task_ids', [])
        action_type = request.data.get('action')
        
        if not task_ids:
            return Response(
                {'error': 'task_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks = Task.objects.filter(id__in=task_ids)
        updated_count = 0

        if action_type == 'read':
            updated_count = tasks.update(is_read=True)
        elif action_type == 'unread':
            updated_count = tasks.update(is_read=False)
        elif action_type == 'disable':
            updated_count = tasks.update(is_disabled=True)
        elif action_type == 'enable':
            updated_count = tasks.update(is_disabled=False)
        elif action_type == 'delete':
            updated_count = tasks.count()
            tasks.delete()
        else:
            return Response(
                {'error': f'Unknown action: {action_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': f'{updated_count} tasks updated',
            'action': action_type,
            'count': updated_count
        })

    @action(detail=True, methods=['get', 'post'], url_path='attachments')
    def attachments(self, request, pk=None):
        """업무 첨부파일 관리"""
        task = self.get_object()

        if request.method == 'GET':
            attachments = task.attachments.all()
            serializer = TaskAttachmentSerializer(attachments, many=True, context={'request': request})
            return Response(serializer.data)

        elif request.method == 'POST':
            files = request.FILES.getlist('files')
            created = []
            for f in files:
                attachment = TaskAttachment.objects.create(
                    task=task,
                    file=f,
                    original_name=f.name,
                    file_size=f.size,
                    uploaded_by=request.user
                )
                created.append(attachment)

            ActivityLog.objects.create(
                project=task.project,
                task=task,
                user=request.user,
                action='file_uploaded',
                description=f'{len(files)}개의 파일이 업로드되었습니다.'
            )

            serializer = TaskAttachmentSerializer(created, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskCommentViewSet(viewsets.ModelViewSet):
    """업무 댓글 ViewSet"""
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 업무 ID로 필터링
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        return queryset

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        
        # 활동 로그 생성
        ActivityLog.objects.create(
            project=comment.task.project,
            task=comment.task,
            user=self.request.user,
            action='commented',
            description=f'댓글이 작성되었습니다.'
        )


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    """업무 첨부파일 ViewSet"""
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 업무 ID로 필터링
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """활동 로그 ViewSet (읽기 전용)"""
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 프로젝트 ID로 필터링
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # 업무 ID로 필터링
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        return queryset[:100]  # 최대 100개


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    """타임시트 ViewSet"""
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # 사용자 필터 (기본: 현재 사용자)
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            queryset = queryset.filter(user=user)

        # 날짜 범위 필터
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)

        # 프로젝트 필터
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset.order_by('work_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        """타임시트 upsert (날짜+프로젝트+업무 기준)"""
        user = request.user
        work_date = request.data.get('work_date')
        project_id = request.data.get('project') or None
        task_id = request.data.get('task') or None
        hours = request.data.get('hours', 0)
        memo = request.data.get('memo', '')

        if not work_date:
            return Response(
                {'error': 'work_date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        entry, created = TimesheetEntry.objects.update_or_create(
            user=user,
            project_id=project_id,
            task_id=task_id,
            work_date=work_date,
            defaults={
                'hours': hours,
                'memo': memo
            }
        )

        serializer = TimesheetEntrySerializer(entry)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """타임시트 집계"""
        user = request.user
        
        # 사용자 필터
        user_id = request.query_params.get('user_id')
        if user_id:
            queryset = TimesheetEntry.objects.filter(user_id=user_id)
        else:
            queryset = TimesheetEntry.objects.filter(user=user)

        # 기간 필터
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)

        # 집계 유형
        group_by = request.query_params.get('group_by', 'project')  # project, month, user

        if group_by == 'project':
            result = queryset.values('project', 'project__name').annotate(
                total_hours=Sum('hours')
            ).order_by('-total_hours')
            data = [
                {
                    'project_id': item['project'],
                    'project_name': item['project__name'] or '미분류',
                    'total_hours': float(item['total_hours'] or 0)
                }
                for item in result
            ]
        elif group_by == 'month':
            result = queryset.annotate(
                month=TruncMonth('work_date')
            ).values('month').annotate(
                total_hours=Sum('hours')
            ).order_by('month')
            data = [
                {
                    'month': item['month'].strftime('%Y-%m') if item['month'] else None,
                    'total_hours': float(item['total_hours'] or 0)
                }
                for item in result
            ]
        else:
            # 전체 합계
            total = queryset.aggregate(total_hours=Sum('hours'))
            data = {'total_hours': float(total['total_hours'] or 0)}

        return Response(data)


class WorkDiaryEntryViewSet(viewsets.ModelViewSet):
    """업무일지 ViewSet"""
    queryset = WorkDiaryEntry.objects.all()
    serializer_class = WorkDiaryEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # 사용자 필터 (기본: 현재 사용자)
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            queryset = queryset.filter(user=user)

        # 날짜 범위 필터
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # 특정 날짜 필터
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)

        # 프로젝트 필터
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='save-day')
    def save_day(self, request):
        """특정 날짜의 업무일지 저장 (기존 삭제 후 새로 생성)"""
        user = request.user
        date = request.data.get('date')
        entries = request.data.get('entries', [])

        if not date:
            return Response(
                {'error': 'date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 해당 날짜의 기존 항목 삭제
        WorkDiaryEntry.objects.filter(user=user, date=date).delete()

        # 새 항목 생성
        created_entries = []
        for entry_data in entries:
            content = entry_data.get('content', '').strip()
            if not content:
                continue
            
            project_id = entry_data.get('project') or None
            task_val = entry_data.get('task')
            task_id = None

            # Task 처리 로직 (ID 또는 이름)
            if task_val:
                # 1. ID인 경우 (숫자형 또는 숫자 문자열)
                if isinstance(task_val, int) or (isinstance(task_val, str) and task_val.isdigit()):
                    task_id = int(task_val)
                
                # 2. 이름 문자열인 경우 (신규 생성 또는 이름 검색) - 프로젝트 필수
                elif isinstance(task_val, str) and project_id:
                    # 같은 프로젝트 내 동일 이름 태스크 검색
                    task_obj = Task.objects.filter(project_id=project_id, title=task_val).first()
                    if not task_obj:
                        # 없으면 신규 생성
                        task_obj = Task.objects.create(
                            project_id=project_id,
                            title=task_val,
                            created_by=user,
                            status='in_progress', # 자동으로 진행중 상태
                            start_date=date       # 시작일은 일지 작성일
                        )
                        # 로그 남기기
                        ActivityLog.objects.create(
                            project_id=project_id,
                            task=task_obj,
                            user=user,
                            action='created',
                            description=f'업무일지 작성 중 자동 생성된 업무입니다.'
                        )
                    task_id = task_obj.id

            entry = WorkDiaryEntry.objects.create(
                user=user,
                date=date,
                project_id=project_id,
                task_id=task_id,
                content=content
            )
            created_entries.append(entry)

        serializer = WorkDiaryEntrySerializer(created_entries, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
