# backend/operation/views.py
"""
영업관리(Operation) 모듈 - Views
"""
from rest_framework import viewsets, status, filters as rf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from django.db.models import Q as DJQ
from .workspace import get_request_workspace

from .models import (
    CustomerCompany, CustomerContact,
    SalesPipeline, SalesStage,
    SalesLead, LeadActivity, LeadTask, LeadFile,
    Quote, QuoteItem, QuoteTemplate
)
from .serializers import (
    CustomerCompanySerializer, CustomerCompanyListSerializer, 
    CustomerContactSerializer,
    SalesPipelineSerializer, SalesStageSerializer,
    SalesLeadListSerializer, SalesLeadDetailSerializer, SalesLeadCreateSerializer,
    LeadActivitySerializer, LeadTaskSerializer, LeadFileSerializer,
    QuoteSerializer, QuoteCreateSerializer, QuoteItemSerializer, QuoteTemplateSerializer,
    CalendarEventSerializer
)
from .filters import (
    CustomerCompanyFilter, CustomerContactFilter,
    SalesLeadFilter, LeadTaskFilter, QuoteFilter
)
from .permissions import IsLeadOwnerOrAssignee, IsOwnerOrReadOnly, IsRelatedToLead
from .services import LeadService

class WorkspaceScopedMixin:
    """
    workspace_field:
      - 기본: "workspace"
      - 관계로 스코프 걸어야 하면 override (예: "pipeline__workspace")
    """
    workspace_field = "workspace"

    @property
    def workspace(self):
        if not hasattr(self, "_workspace_cache"):
            self._workspace_cache = get_request_workspace(self.request)
        return self._workspace_cache

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["workspace"] = self.workspace
        return ctx

    def get_queryset(self):
        qs = super().get_queryset()
        wf = getattr(self, "workspace_field", None)
        if not wf:
            return qs
        # ✅ workspace 우선(기본: strict). 레거시 null을 같이 보여주고 싶으면 OR를 다시 추가.
        return qs.filter(DJQ(**{wf: self.workspace}))

    def perform_create(self, serializer):
        model = serializer.Meta.model
        field_names = {f.name for f in model._meta.fields}
        extra = {}
        if "workspace" in field_names:
            extra["workspace"] = self.workspace
        if "created_by" in field_names:
            extra["created_by"] = self.request.user
        serializer.save(**extra)

# ============================================================
# 고객 관리
# ============================================================
class CustomerCompanyViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """고객사 ViewSet"""
    queryset = CustomerCompany.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter, rf_filters.OrderingFilter]
    filterset_class = CustomerCompanyFilter
    search_fields = ['name', 'business_number', 'industry']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerCompanyListSerializer
        return CustomerCompanySerializer

class CustomerContactViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """고객 담당자 ViewSet"""
    queryset = CustomerContact.objects.all()
    serializer_class = CustomerContactSerializer
    workspace_field = "company__workspace"
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter]
    filterset_class = CustomerContactFilter
    search_fields = ['name', 'email', 'phone']


# ============================================================
# 파이프라인 / 단계
# ============================================================
class SalesPipelineViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """파이프라인 ViewSet"""
    queryset = SalesPipeline.objects.filter(is_active=True)
    serializer_class = SalesPipelineSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'])
    def stages(self, request, pk=None):
        """파이프라인의 단계 목록"""
        pipeline = self.get_object()
        stages = pipeline.stages.all()
        serializer = SalesStageSerializer(stages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def leads(self, request, pk=None):
        """파이프라인의 리드 목록 (칸반용)"""
        pipeline = self.get_object()
        leads = SalesLead.objects.filter(
            pipeline=pipeline,
            status='active'
        ).select_related('stage', 'company', 'contact', 'owner')
        
        # 단계별로 그룹화
        result = {}
        for stage in pipeline.stages.all():
            stage_leads = leads.filter(stage=stage)
            result[stage.id] = {
                'stage': SalesStageSerializer(stage).data,
                'leads': SalesLeadListSerializer(stage_leads, many=True).data
            }
        
        return Response(result)


class SalesStageViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """영업 단계 ViewSet"""
    queryset = SalesStage.objects.all()
    serializer_class = SalesStageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['pipeline']
    workspace_field = "pipeline__workspace"


# ============================================================
# 영업 기회 (Lead)
# ============================================================
class SalesLeadViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """영업기회 ViewSet"""
    queryset = SalesLead.objects.all()
    permission_classes = [IsAuthenticated, IsLeadOwnerOrAssignee]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter, rf_filters.OrderingFilter]
    filterset_class = SalesLeadFilter
    search_fields = ['title', 'description', 'company__name', 'contact__name']
    ordering_fields = ['created_at', 'updated_at', 'expected_close_date', 'expected_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related(
            'pipeline', 'stage', 'company', 'contact', 'owner', 'created_by'
        ).prefetch_related('assignees', 'activities', 'tasks', 'files')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SalesLeadListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SalesLeadCreateSerializer
        return SalesLeadDetailSerializer
    
    def perform_create(self, serializer):
        # 서비스 레이어를 통해 생성 (자동 활동 기록)
        lead_data = serializer.validated_data.copy()
        # ✅ workspace 스코프 강제 주입 (mixin perform_create 우회하므로 직접 넣어야 함)
        lead_data["workspace"] = self.workspace
        lead, activity = LeadService.create_lead_with_activity(lead_data, self.request.user)
        # serializer의 instance 설정
        serializer.instance = lead
    
    @action(detail=True, methods=['post'])
    def move_stage(self, request, pk=None):
        """단계 이동 (칸반 DnD용)"""
        lead = self.get_object()
        stage_id = request.data.get('stage_id')
        note = request.data.get('note', '')
        
        if not stage_id:
            return Response(
                {'error': 'stage_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # ✅ 같은 pipeline 이면서 같은 workspace 소속 stage만 허용
            new_stage = SalesStage.objects.get(
                id=stage_id,
                pipeline=lead.pipeline,
                pipeline__workspace=self.workspace,
            )
        except SalesStage.DoesNotExist:
            return Response(
                {'error': 'Invalid stage_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 서비스 레이어를 통해 단계 이동
        activity = LeadService.move_stage(lead, new_stage, request.user, note)
        
        if activity:
            return Response({
                'success': True,
                'lead': SalesLeadDetailSerializer(lead).data,
                'activity': LeadActivitySerializer(activity).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Already in this stage'
            })
    
    @action(detail=True, methods=['get', 'post'])
    def activities(self, request, pk=None):
        """활동 목록 조회/추가"""
        lead = self.get_object()
        
        if request.method == 'GET':
            activities = lead.activities.all()
            serializer = LeadActivitySerializer(activities, many=True)
            return Response(serializer.data)
        
        # POST: 새 활동 추가
        activity = LeadService.create_activity(
            lead=lead,
            activity_type=request.data.get('activity_type', 'note'),
            title=request.data.get('title', ''),
            content=request.data.get('content', ''),
            user=request.user
        )
        return Response(
            LeadActivitySerializer(activity).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get', 'post'])
    def tasks(self, request, pk=None):
        """할 일 목록 조회/추가"""
        lead = self.get_object()
        
        if request.method == 'GET':
            tasks = lead.tasks.all()
            serializer = LeadTaskSerializer(tasks, many=True)
            return Response(serializer.data)
        
        # POST: 새 할 일 추가
        serializer = LeadTaskSerializer(data={
            **request.data,
            'lead': lead.id
        })
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def files(self, request, pk=None):
        """파일 목록 조회/추가"""
        lead = self.get_object()
        
        if request.method == 'GET':
            files = lead.files.all()
            serializer = LeadFileSerializer(files, many=True, context={'request': request})
            return Response(serializer.data)
        
        # POST: 파일 추가
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lead_file, activity = LeadService.add_file(lead, uploaded_file, request.user)
        return Response(
            LeadFileSerializer(lead_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


# ============================================================
# 활동 로그 / 할 일 / 파일
# ============================================================
class LeadActivityViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """활동 로그 ViewSet"""
    queryset = LeadActivity.objects.all()
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead', 'activity_type']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        # created_by만 주입 (workspace는 lead를 통해 스코프)
        serializer.save(created_by=self.request.user)


class LeadTaskViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """할 일 ViewSet"""
    queryset = LeadTask.objects.all()
    serializer_class = LeadTaskSerializer
    permission_classes = [IsAuthenticated, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = LeadTaskFilter
    ordering_fields = ['due_date', 'priority', 'created_at']
    ordering = ['is_completed', 'due_date']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """할 일 완료 처리"""
        task = self.get_object()
        
        if task.is_completed:
            return Response({'message': 'Already completed'})
        
        activity = LeadService.complete_task(task, request.user)
        return Response({
            'task': LeadTaskSerializer(task).data,
            'activity': LeadActivitySerializer(activity).data
        })
    
    @action(detail=True, methods=['post'])
    def uncomplete(self, request, pk=None):
        """완료 취소"""
        task = self.get_object()
        task.is_completed = False
        task.completed_at = None
        task.save()
        return Response(LeadTaskSerializer(task).data)


class LeadFileViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """첨부파일 ViewSet"""
    queryset = LeadFile.objects.all()
    serializer_class = LeadFileSerializer
    permission_classes = [IsAuthenticated, IsRelatedToLead]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        serializer.save(
            uploaded_by=self.request.user,
            name=uploaded_file.name if uploaded_file else '',
            size=uploaded_file.size if uploaded_file else 0
        )


# ============================================================
# 견적서
# ============================================================
class QuoteViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """견적서 ViewSet"""
    queryset = Quote.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = QuoteFilter
    ordering_fields = ['created_at', 'total_amount']
    ordering = ['-created_at']
    workspace_field = "workspace"
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuoteCreateSerializer
        return QuoteSerializer
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """견적서 발송 처리"""
        quote = self.get_object()
        
        if quote.status != 'draft':
            return Response(
                {'error': 'Only draft quotes can be sent'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activity = LeadService.send_quote(quote, request.user)
        return Response({
            'quote': QuoteSerializer(quote).data,
            'activity': LeadActivitySerializer(activity).data
        })
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """견적 항목 추가"""
        quote = self.get_object()
        
        serializer = QuoteItemSerializer(data={
            **request.data,
            'quote': quote.id
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # 합계 재계산
        quote.calculate_totals()
        
        return Response(QuoteSerializer(quote).data)
    
    @action(detail=True, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)')
    def remove_item(self, request, pk=None, item_id=None):
        """견적 항목 삭제"""
        quote = self.get_object()
        
        try:
            item = quote.items.get(id=item_id)
            item.delete()
            quote.calculate_totals()
            return Response(QuoteSerializer(quote).data)
        except QuoteItem.DoesNotExist:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class QuoteTemplateViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """견적 템플릿 ViewSet"""
    queryset = QuoteTemplate.objects.all()
    serializer_class = QuoteTemplateSerializer
    permission_classes = [IsAuthenticated]
    workspace_field = "workspace"


# ============================================================
# 캘린더 피드
# ============================================================
class CalendarFeedView(APIView):
    """통합 캘린더 피드 - TODO + 예상마감일"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import datetime, timedelta
        workspace = get_request_workspace(request)
        
        # 쿼리 파라미터
        start_date = request.query_params.get('start')
        end_date = request.query_params.get('end')
        
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_date = timezone.now() - timedelta(days=30)
        
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_date = timezone.now() + timedelta(days=60)
        
        events = []
        
        # 1. LeadTask (할 일)
        tasks = LeadTask.objects.filter(
            show_on_calendar=True,
            due_date__gte=start_date,
            due_date__lte=end_date
        ).select_related('lead').filter(lead__workspace=workspace)
        
        for task in tasks:
            events.append({
                'id': f'task_{task.id}',
                'title': task.title,
                'start': task.due_date,
                'end': task.due_date,
                'event_type': 'task',
                'lead_id': task.lead.id,
                'lead_title': task.lead.title,
                'color': '#10B981' if task.is_completed else (
                    '#EF4444' if task.due_date < timezone.now() else '#3B82F6'
                ),
                'is_completed': task.is_completed
            })
        
        # 2. SalesLead expected_close_date
        leads = SalesLead.objects.filter(
            expected_close_date__gte=start_date.date(),
            expected_close_date__lte=end_date.date(),
            status='active'
        ).filter(workspace=workspace)
        
        for lead in leads:
            from datetime import datetime as dt
            close_datetime = timezone.make_aware(
                dt.combine(lead.expected_close_date, dt.min.time())
            )
            events.append({
                'id': f'close_{lead.id}',
                'title': f'[마감예정] {lead.title}',
                'start': close_datetime,
                'end': close_datetime,
                'event_type': 'close_date',
                'lead_id': lead.id,
                'lead_title': lead.title,
                'color': '#F59E0B',
                'is_completed': False
            })
        
        serializer = CalendarEventSerializer(events, many=True)
        return Response(serializer.data)


# ============================================================
# 접수함 (Inbox)
# ============================================================
class InboxView(APIView):
    """영업접수함 - 신규/미배정 리드"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        workspace = get_request_workspace(request)
        leads = LeadService.get_inbox_leads(request.user, workspace)
        serializer = SalesLeadListSerializer(leads, many=True)
        return Response(serializer.data)


# ============================================================
# 대시보드 통계
# ============================================================
class SalesDashboardView(APIView):
    """영업 대시보드 통계"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.db.models import Sum, Count
        workspace = get_request_workspace(request)
        
        # 전체 통계
        leads = SalesLead.objects.filter(workspace=workspace)
        
        total = leads.count()
        active = leads.filter(status='active').count()
        won = leads.filter(status='won').count()
        lost = leads.filter(status='lost').count()
        
        total_amount = leads.filter(status='active').aggregate(
            total=Sum('expected_amount')
        )['total'] or 0
        
        # 이번 달 통계
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month = leads.filter(created_at__gte=this_month_start)
        
        # 지연 리드
        stalled_count = leads.filter(status='active').filter(
            stage_entered_at__lte=now - timezone.timedelta(days=7)
        ).count()
        
        # 다가오는 마감
        upcoming_closes = leads.filter(
            status='active',
            expected_close_date__gte=now.date(),
            expected_close_date__lte=(now + timezone.timedelta(days=7)).date()
        ).count()
        
        return Response({
            'total': total,
            'active': active,
            'won': won,
            'lost': lost,
            'win_rate': round(won / (won + lost) * 100, 1) if (won + lost) > 0 else 0,
            'total_amount': total_amount,
            'this_month_new': this_month.count(),
            'stalled_count': stalled_count,
            'upcoming_closes': upcoming_closes,
        })
