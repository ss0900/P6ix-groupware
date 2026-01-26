# backend/operation/views.py
"""
영업관리(Operation) 모듈 - Views
"""
from rest_framework import viewsets, status, filters as rf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, ExpressionWrapper, fields
from django.db.models import Q as DJQ
from django.db.models.functions import Now, ExtractDay
from .workspace import get_request_workspace

from .models import (
    CustomerCompany, CustomerContact,
    SalesPipeline, SalesStage,
    SalesLead, LeadActivity, LeadTask, LeadFile,
    Quote, QuoteItem, QuoteTemplate,
    SalesContractLink, Tender, RevenueMilestone, Collection,
    EmailTemplate, EmailSignature, EmailSendLog
)
from .serializers import (
    CustomerCompanySerializer, CustomerCompanyListSerializer, 
    CustomerContactSerializer,
    SalesPipelineSerializer, SalesStageSerializer,
    SalesLeadListSerializer, SalesLeadDetailSerializer, SalesLeadCreateSerializer,
    LeadActivitySerializer, LeadTaskSerializer, LeadFileSerializer,
    QuoteSerializer, QuoteCreateSerializer, QuoteItemSerializer, QuoteTemplateSerializer,
    SalesContractLinkSerializer, TenderSerializer, RevenueMilestoneSerializer, CollectionSerializer,
    EmailTemplateSerializer, EmailSignatureSerializer, EmailSendLogSerializer,
    CalendarEventSerializer, InboxAcceptSerializer
)
from .filters import (
    CustomerCompanyFilter, CustomerContactFilter,
    SalesLeadFilter, LeadTaskFilter, QuoteFilter,
    SalesContractLinkFilter, TenderFilter, RevenueMilestoneFilter, CollectionFilter, EmailSendLogFilter
)
from .permissions import (
    IsLeadOwnerOrAssignee,
    IsOwnerOrReadOnly,
    IsRelatedToLead,
    IsOperationManagerOrReadOnly,
)
from .services import LeadService


class OperationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


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
    permission_classes = [IsAuthenticated, IsAdminUser]
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
    permission_classes = [IsAuthenticated, IsAdminUser]
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
    permission_classes = [IsAuthenticated, IsAdminUser, IsOperationManagerOrReadOnly]
    
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
    permission_classes = [IsAuthenticated, IsAdminUser, IsOperationManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['pipeline']
    workspace_field = "pipeline__workspace"


# ============================================================
# 영업 기회 (Lead)
# ============================================================
class SalesLeadViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """영업기회 ViewSet"""
    queryset = SalesLead.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser, IsLeadOwnerOrAssignee]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter, rf_filters.OrderingFilter]
    filterset_class = SalesLeadFilter
    search_fields = ['title', 'description', 'company__name', 'contact__name', 'contact__phone', 'contact__email']
    ordering_fields = ['created_at', 'updated_at', 'expected_close_date', 'expected_amount', 'stalled_days']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        duration = ExpressionWrapper(
            Now() - F("stage_entered_at"),
            output_field=fields.DurationField()
        )
        queryset = queryset.annotate(stalled_days=ExtractDay(duration))
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
    
    @action(detail=True, methods=['post'])
    def accept_inbox(self, request, pk=None):
        """
        접수 처리:
        - (기본) owner가 없으면 현재 user를 owner로 지정
        - (옵션) stage 이동
        - (옵션) 다음 액션 TODO 생성
        - (자동) 활동 로그 남김
        """
        lead = self.get_object()

        serializer = InboxAcceptSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data

        result = LeadService.accept_inbox(
            lead=lead,
            user=request.user,
            workspace=self.workspace,
            owner_id=v.get('owner_id'),
            stage_id=v.get('stage_id'),
            note=v.get('note', ''),
            create_task=v.get('create_task', False),
            task_title=v.get('task_title', ''),
            task_due_date=v.get('task_due_date'),
            task_priority=v.get('task_priority', 'medium'),
            task_assignee_id=v.get('task_assignee_id'),
        )

        payload = {
            "lead": SalesLeadDetailSerializer(result["lead"]).data,
        }
        if result.get("stage_activity"):
            payload["stage_activity"] = LeadActivitySerializer(result["stage_activity"]).data
        if result.get("accept_activity"):
            payload["accept_activity"] = LeadActivitySerializer(result["accept_activity"]).data
        if result.get("task"):
            payload["task"] = LeadTaskSerializer(result["task"]).data

        return Response(payload, status=status.HTTP_200_OK)
    
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
        task = serializer.save(created_by=request.user)
        LeadService.refresh_next_action_due(lead)
        return Response(LeadTaskSerializer(task).data, status=status.HTTP_201_CREATED)
    
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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """영업기회 통계 (대시보드용)"""
        from django.db.models import Count, Sum
        
        qs = self.get_queryset()
        
        # 상태별 집계
        by_status = list(
            qs.values('status').annotate(count=Count('id')).order_by('status')
        )
        
        # 단계별 집계
        by_stage = list(
            qs.filter(status='active')
            .values('stage__name')
            .annotate(count=Count('id'))
            .order_by('stage__order')
        )
        
        # 금액 집계
        total_amount = qs.filter(status='active').aggregate(
            total=Sum('expected_amount')
        )['total'] or 0
        
        return Response({
            'by_status': by_status,
            'by_stage': by_stage,
            'total_expected_amount': total_amount,
            'active_count': qs.filter(status='active').count(),
            'won_count': qs.filter(status='won').count(),
            'lost_count': qs.filter(status='lost').count(),
        })


# ============================================================
# 활동 로그 / 할 일 / 파일
# ============================================================
class LeadActivityViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """활동 로그 ViewSet"""
    queryset = LeadActivity.objects.all()
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead', 'activity_type']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        # created_by만 주입 (workspace는 lead를 통해 스코프)
        activity = serializer.save(created_by=self.request.user)
        if activity.activity_type in ['call', 'email', 'meeting']:
            activity.lead.last_contacted_at = timezone.now()
            activity.lead.save(update_fields=['last_contacted_at'])


class LeadTaskViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """할 일 ViewSet"""
    queryset = LeadTask.objects.all()
    serializer_class = LeadTaskSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = LeadTaskFilter
    ordering_fields = ['due_date', 'priority', 'created_at']
    ordering = ['is_completed', 'due_date']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        if task.lead_id:
            LeadService.refresh_next_action_due(task.lead)

    def perform_update(self, serializer):
        task = self.get_object()
        prev_lead = task.lead
        updated = serializer.save()
        if prev_lead and prev_lead.id != updated.lead_id:
            LeadService.refresh_next_action_due(prev_lead)
        if updated.lead_id:
            LeadService.refresh_next_action_due(updated.lead)

    def perform_destroy(self, instance):
        lead = instance.lead
        instance.delete()
        if lead:
            LeadService.refresh_next_action_due(lead)
    
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
        if task.lead_id:
            LeadService.refresh_next_action_due(task.lead)
        return Response(LeadTaskSerializer(task).data)


class LeadFileViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """첨부파일 ViewSet"""
    queryset = LeadFile.objects.all()
    serializer_class = LeadFileSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead']
    workspace_field = "lead__workspace"
    
    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        lead_file = serializer.save(
            uploaded_by=self.request.user,
            name=uploaded_file.name if uploaded_file else '',
            size=uploaded_file.size if uploaded_file else 0
        )
        if lead_file.lead_id:
            LeadService.create_activity(
                lead=lead_file.lead,
                activity_type='file_added',
                title=f"File added: {lead_file.name}",
                content=f"File size: {lead_file.size} bytes",
                user=self.request.user,
            )


# ============================================================
# 견적서
# ============================================================
class QuoteViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """견적서 ViewSet"""
    queryset = Quote.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter, rf_filters.OrderingFilter]
    filterset_class = QuoteFilter
    ordering_fields = ['created_at', 'total_amount']
    ordering = ['-created_at']
    workspace_field = "workspace"
    search_fields = ['quote_number', 'title', 'company__name', 'lead__title']
    pagination_class = OperationPagination
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        quote = serializer.instance
        LeadService.create_activity(
            lead=quote.lead,
            activity_type='quote_created',
            title=f"견적 생성: {quote.quote_number}",
            content=f"견적 금액: {quote.total_amount:,}원",
            user=self.request.user
        )
    
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
        to = None
        if quote.contact and quote.contact.email:
            to = quote.contact.email
        elif quote.lead and quote.lead.contact and quote.lead.contact.email:
            to = quote.lead.contact.email
        else:
            to = "unknown"

        log = EmailSendLog.objects.create(
            workspace=self.workspace,
            lead=quote.lead,
            to=to,
            subject=quote.title,
            body_snapshot="Quote sent via system.",
            status="sent",
            sent_at=quote.sent_at or timezone.now(),
            created_by=request.user
        )
        return Response({
            'quote': QuoteSerializer(quote).data,
            'activity': LeadActivitySerializer(activity).data,
            'email_log': EmailSendLogSerializer(log).data
        })

    @action(detail=True, methods=['get'])
    def render_pdf(self, request, pk=None):
        """견적서 PDF 렌더링 (1차: URL 반환)"""
        quote = self.get_object()
        return Response({
            'quote_id': quote.id,
            'quote_number': quote.quote_number,
            'pdf_url': request.build_absolute_uri(f"/media/quotes/{quote.id}.pdf")
        })

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """견적서 이메일 발송(로그 생성)"""
        from django.utils.dateparse import parse_datetime

        quote = self.get_object()
        to = request.data.get("to")
        subject = request.data.get("subject") or quote.title
        body_html = request.data.get("body_html") or ""
        scheduled_at = request.data.get("scheduled_at")
        scheduled_dt = parse_datetime(scheduled_at) if scheduled_at else None

        if not to:
            return Response(
                {'error': 'to is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        log_status = "pending" if scheduled_dt else "sent"
        sent_at = None if scheduled_dt else timezone.now()

        log = EmailSendLog.objects.create(
            workspace=self.workspace,
            lead=quote.lead,
            to=to,
            subject=subject,
            body_snapshot=body_html,
            status=log_status,
            scheduled_at=scheduled_dt,
            sent_at=sent_at,
            created_by=request.user
        )

        activity = None
        if not scheduled_dt:
            activity = LeadService.send_quote(quote, request.user)

        return Response({
            'quote': QuoteSerializer(quote).data,
            'email_log': EmailSendLogSerializer(log).data,
            'activity': LeadActivitySerializer(activity).data if activity else None
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
    permission_classes = [IsAuthenticated, IsAdminUser]
    workspace_field = "workspace"


class SalesContractLinkViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """계약 연결 ViewSet"""
    queryset = SalesContractLink.objects.all()
    serializer_class = SalesContractLinkSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend]
    filterset_class = SalesContractLinkFilter
    workspace_field = "workspace"


class TenderViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """입찰 ViewSet"""
    queryset = Tender.objects.all()
    serializer_class = TenderSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.SearchFilter, rf_filters.OrderingFilter]
    filterset_class = TenderFilter
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'created_at']
    ordering = ['-created_at']
    workspace_field = "workspace"


class RevenueMilestoneViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """매출 계획 ViewSet"""
    queryset = RevenueMilestone.objects.all()
    serializer_class = RevenueMilestoneSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = RevenueMilestoneFilter
    ordering_fields = ['planned_date', 'planned_amount', 'created_at']
    ordering = ['-planned_date']
    workspace_field = "workspace"


class CollectionViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """수금 ViewSet"""
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = CollectionFilter
    ordering_fields = ['due_date', 'amount', 'created_at']
    ordering = ['-due_date']
    workspace_field = "workspace"


class EmailTemplateViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """이메일 템플릿 ViewSet"""
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    workspace_field = "workspace"


class EmailSignatureViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """이메일 서명 ViewSet"""
    queryset = EmailSignature.objects.all()
    serializer_class = EmailSignatureSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    workspace_field = "workspace"


class EmailSendLogViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    """이메일 발송 로그 ViewSet"""
    queryset = EmailSendLog.objects.all()
    serializer_class = EmailSendLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser, IsRelatedToLead]
    filter_backends = [DjangoFilterBackend, rf_filters.OrderingFilter]
    filterset_class = EmailSendLogFilter
    ordering_fields = ['sent_at', 'created_at']
    ordering = ['-created_at']
    workspace_field = "workspace"


# ============================================================
# 캘린더 피드
# ============================================================
class CalendarFeedView(APIView):
    """통합 캘린더 피드 - TODO + 예상마감일"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
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
            lead__workspace=workspace,
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
                'source_id': task.id,
                'lead_id': task.lead.id,
                'lead_title': task.lead.title,
                'color': '#10B981' if task.is_completed else (
                    '#EF4444' if task.due_date < timezone.now() else '#3B82F6'
                ),
                'is_completed': task.is_completed
            })
        
        # 2. SalesLead expected_close_date
        leads = SalesLead.objects.filter(
            workspace=workspace,
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
                'source_id': lead.id,
                'lead_id': lead.id,
                'lead_title': lead.title,
                'color': '#F59E0B',
                'is_completed': False
            })

        # 3. Quote valid_until
        quotes = Quote.objects.filter(
            workspace=workspace,
            valid_until__gte=start_date.date(),
            valid_until__lte=end_date.date()
        ).select_related('lead')

        for quote in quotes:
            from datetime import datetime as dt
            valid_datetime = timezone.make_aware(
                dt.combine(quote.valid_until, dt.min.time())
            )
            events.append({
                'id': f'quote_{quote.id}',
                'title': f'[견적 유효] {quote.title}',
                'start': valid_datetime,
                'end': valid_datetime,
                'event_type': 'quote_valid_until',
                'source_id': quote.id,
                'lead_id': quote.lead_id,
                'lead_title': quote.lead.title if quote.lead else "-",
                'color': '#6366F1',
                'is_completed': quote.status in ['accepted', 'rejected', 'expired']
            })

        # 4. Tender deadline
        tenders = Tender.objects.filter(
            workspace=workspace,
            deadline__gte=start_date,
            deadline__lte=end_date
        ).select_related('lead')

        for tender in tenders:
            events.append({
                'id': f'tender_{tender.id}',
                'title': f'[입찰 마감] {tender.title}',
                'start': tender.deadline,
                'end': tender.deadline,
                'event_type': 'tender_deadline',
                'source_id': tender.id,
                'lead_id': tender.lead_id or 0,
                'lead_title': tender.lead.title if tender.lead else "-",
                'color': '#EF4444' if tender.status in ['lost'] else '#14B8A6',
                'is_completed': tender.status in ['won', 'lost', 'closed']
            })
        
        serializer = CalendarEventSerializer(events, many=True)
        return Response(serializer.data)


# ============================================================
# 접수함 (Inbox)
# ============================================================
class InboxView(APIView):
    """영업접수함 - 신규/미배정 리드"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
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
    permission_classes = [IsAuthenticated, IsAdminUser]
    
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
        
        # 단계별 전환/현황
        stage_counts = {
            row["stage"]: row["count"]
            for row in SalesLead.objects.filter(workspace=workspace)
            .values("stage")
            .annotate(count=Count("id"))
        }
        stage_stats = []
        pipelines = {}
        for stage in SalesStage.objects.filter(pipeline__workspace=workspace).order_by("pipeline_id", "order"):
            pipelines.setdefault(stage.pipeline_id, []).append(stage)

        for pipeline_id, stage_list in pipelines.items():
            prev_count = None
            for stage in stage_list:
                count = stage_counts.get(stage.id, 0)
                conversion = None
                if prev_count and prev_count > 0:
                    conversion = round(count / prev_count * 100, 1)
                stage_stats.append({
                    "stage_id": stage.id,
                    "stage_name": stage.name,
                    "pipeline_id": pipeline_id,
                    "pipeline_name": stage.pipeline.name,
                    "order": stage.order,
                    "lead_count": count,
                    "conversion_rate": conversion,
                })
                prev_count = count

        # 지연 리드 TOP
        stalled_leads = leads.filter(status='active').select_related('stage', 'owner').order_by('stage_entered_at')[:5]
        stalled_list = []
        for lead in stalled_leads:
            stalled_list.append({
                "id": lead.id,
                "title": lead.title,
                "stage_name": lead.stage.name if lead.stage else "",
                "owner_name": lead.owner.username if lead.owner else "",
                "stalled_days": lead.stalled_days,
                "expected_amount": lead.expected_amount or 0,
            })

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
            'stage_stats': stage_stats,
            'stalled_leads': stalled_list,
        })


class RevenueSummaryView(APIView):
    """매출/수금 요약"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from django.db.models import Sum
        workspace = get_request_workspace(request)

        milestones = RevenueMilestone.objects.filter(workspace=workspace)
        collections = Collection.objects.filter(workspace=workspace)

        planned_total = milestones.filter(status='planned').aggregate(total=Sum('planned_amount'))['total'] or 0
        invoiced_total = milestones.filter(status='invoiced').aggregate(total=Sum('planned_amount'))['total'] or 0
        collected_total = milestones.filter(status='collected').aggregate(total=Sum('planned_amount'))['total'] or 0

        received_total = collections.filter(status='received').aggregate(total=Sum('amount'))['total'] or 0
        outstanding_total = collections.exclude(status='received').aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'planned_total': planned_total,
            'invoiced_total': invoiced_total,
            'collected_total': collected_total,
            'received_total': received_total,
            'outstanding_total': outstanding_total,
        })
