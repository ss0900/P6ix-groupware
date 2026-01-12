# backend/operation/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import Client, SalesOpportunity, Estimate, EstimateItem, Contract
from .serializers import (
    ClientSerializer,
    SalesOpportunityListSerializer, SalesOpportunityDetailSerializer,
    EstimateListSerializer, EstimateDetailSerializer, EstimateItemSerializer,
    ContractSerializer
)


class ClientViewSet(viewsets.ModelViewSet):
    """거래처 ViewSet"""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(industry__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SalesOpportunityViewSet(viewsets.ModelViewSet):
    """영업 기회 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SalesOpportunity.objects.select_related("client", "owner")
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 담당자 필터
        owner = self.request.query_params.get("owner")
        if owner == "me":
            qs = qs.filter(owner=self.request.user)
        elif owner:
            qs = qs.filter(owner_id=owner)
        
        # 검색
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(client__name__icontains=search)
            )
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return SalesOpportunityListSerializer
        return SalesOpportunityDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """영업 통계"""
        qs = self.get_queryset()
        
        # 상태별 현황
        by_status = qs.values("status").annotate(
            count=Count("id"),
            total_amount=Sum("expected_amount")
        )
        
        # 파이프라인
        pipeline_qs = qs.exclude(status__in=["won", "lost"])
        pipeline_total = pipeline_qs.aggregate(total=Sum("expected_amount"))
        pipeline = {
            "total": pipeline_total.get("total") or 0,
            "weighted": (pipeline_total.get("total") or 0) * 0.5  # 가중 평균 근사
        }
        
        # 이번 달 수주
        this_month = timezone.now().replace(day=1)
        won_this_month = qs.filter(
            status="won",
            updated_at__gte=this_month
        ).aggregate(
            count=Count("id"),
            amount=Sum("expected_amount")
        )
        
        return Response({
            "by_status": list(by_status),
            "pipeline": pipeline,
            "won_this_month": won_this_month
        })


class EstimateViewSet(viewsets.ModelViewSet):
    """견적 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Estimate.objects.select_related(
            "opportunity", "opportunity__client", "created_by"
        ).prefetch_related("items")
        
        # 기회 필터
        opportunity = self.request.query_params.get("opportunity")
        if opportunity:
            qs = qs.filter(opportunity_id=opportunity)
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return EstimateListSerializer
        return EstimateDetailSerializer

    def perform_create(self, serializer):
        # 견적번호 자동 생성
        today = timezone.now()
        prefix = f"EST-{today.strftime('%Y%m%d')}"
        last = Estimate.objects.filter(estimate_number__startswith=prefix).order_by("-estimate_number").first()
        if last:
            seq = int(last.estimate_number.split("-")[-1]) + 1
        else:
            seq = 1
        estimate_number = f"{prefix}-{seq:03d}"
        
        serializer.save(created_by=self.request.user, estimate_number=estimate_number)

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        """견적 항목 추가"""
        estimate = self.get_object()
        serializer = EstimateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(estimate=estimate)
        
        # 합계 재계산
        self._recalculate_total(estimate)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _recalculate_total(self, estimate):
        subtotal = estimate.items.aggregate(total=Sum("amount"))["total"] or 0
        tax = subtotal * 0.1
        estimate.subtotal = subtotal
        estimate.tax = tax
        estimate.total = subtotal + tax
        estimate.save(update_fields=["subtotal", "tax", "total"])


class ContractViewSet(viewsets.ModelViewSet):
    """계약 ViewSet"""
    queryset = Contract.objects.select_related("client", "opportunity", "created_by")
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 거래처 필터
        client = self.request.query_params.get("client")
        if client:
            qs = qs.filter(client_id=client)
        
        return qs

    def perform_create(self, serializer):
        # 계약번호 자동 생성
        today = timezone.now()
        prefix = f"CON-{today.strftime('%Y%m%d')}"
        last = Contract.objects.filter(contract_number__startswith=prefix).order_by("-contract_number").first()
        if last:
            seq = int(last.contract_number.split("-")[-1]) + 1
        else:
            seq = 1
        contract_number = f"{prefix}-{seq:03d}"
        
        serializer.save(created_by=self.request.user, contract_number=contract_number)
