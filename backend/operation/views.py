# backend/operation/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth, TruncYear, ExtractYear
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta

from .models import (
    Client, SalesOpportunity, Estimate, EstimateItem,
    Contract, QuoteTemplate, BillingSchedule, Invoice, Payment
)
from .serializers import (
    ClientListSerializer, ClientDetailSerializer, ClientHierarchySerializer,
    SalesOpportunityListSerializer, SalesOpportunityDetailSerializer,
    EstimateListSerializer, EstimateDetailSerializer, EstimateItemSerializer,
    ContractListSerializer, ContractDetailSerializer,
    QuoteTemplateSerializer,
    BillingScheduleSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer,
    PaymentSerializer
)


class ClientViewSet(viewsets.ModelViewSet):
    """거래처 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Client.objects.select_related("parent", "created_by")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(industry__icontains=search)
            )
        
        # 최상위만 조회 (계층 구조용)
        hierarchy = self.request.query_params.get("hierarchy")
        if hierarchy == "true":
            qs = qs.filter(parent__isnull=True)
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            # hierarchy 파라미터가 있으면 계층 구조 serializer
            if self.request.query_params.get("hierarchy") == "true":
                return ClientHierarchySerializer
            return ClientListSerializer
        if self.action == "retrieve":
            return ClientDetailSerializer
        return ClientListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def aggregation(self, request, pk=None):
        """거래처 및 하위 부서 집계 데이터"""
        client = self.get_object()
        all_opportunities = client.get_all_opportunities()
        all_contracts = client.get_all_contracts()

        # 상태별 영업 기회
        by_status = all_opportunities.values("status").annotate(
            count=Count("id"),
            total_amount=Sum("expected_amount")
        )

        # 수주 합계
        won = all_opportunities.filter(status="won").aggregate(
            count=Count("id"),
            amount=Sum("expected_amount")
        )

        # 계약 합계
        contracts = all_contracts.aggregate(
            count=Count("id"),
            amount=Sum("amount")
        )

        return Response({
            "client_id": client.id,
            "client_name": client.name,
            "descendants_count": len(client.get_descendants()),
            "opportunities_by_status": list(by_status),
            "won_total": won,
            "contracts_total": contracts
        })


class SalesOpportunityViewSet(viewsets.ModelViewSet):
    """영업 기회 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SalesOpportunity.objects.select_related("client", "owner")
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 정체 상태 필터
        stagnant = self.request.query_params.get("stagnant")
        if stagnant == "true":
            qs = qs.filter(
                Q(next_step="") | Q(next_step__isnull=True)
            ).exclude(status__in=["won", "lost"])
        
        # 담당자 필터
        owner = self.request.query_params.get("owner")
        if owner == "me":
            qs = qs.filter(owner=self.request.user)
        elif owner:
            qs = qs.filter(owner_id=owner)
        
        # 거래처 필터
        client = self.request.query_params.get("client")
        if client:
            qs = qs.filter(client_id=client)
        
        # 기간 필터
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
        
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
        """영업 통계 (Drill-down 지원)"""
        qs = self.get_queryset()
        
        # 상태별 현황
        by_status = qs.values("status").annotate(
            count=Count("id"),
            total_amount=Sum("expected_amount")
        )
        
        # 파이프라인 (진행중인 것만)
        pipeline_qs = qs.exclude(status__in=["won", "lost"])
        pipeline_total = pipeline_qs.aggregate(
            total=Sum("expected_amount"),
            count=Count("id")
        )
        
        # 가중치 적용 파이프라인
        weighted_pipeline = 0
        for opp in pipeline_qs:
            weighted_pipeline += float(opp.weighted_amount)
        
        pipeline = {
            "total": pipeline_total.get("total") or 0,
            "count": pipeline_total.get("count") or 0,
            "weighted": weighted_pipeline
        }
        
        # 이번 달 수주
        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        won_this_month = qs.filter(
            status="won",
            updated_at__gte=this_month
        ).aggregate(
            count=Count("id"),
            amount=Sum("expected_amount")
        )
        
        # 정체 상태 건수
        stagnant_count = qs.filter(
            Q(next_step="") | Q(next_step__isnull=True)
        ).exclude(status__in=["won", "lost"]).count()
        
        return Response({
            "by_status": list(by_status),
            "pipeline": pipeline,
            "won_this_month": won_this_month,
            "stagnant_count": stagnant_count
        })

    @action(detail=False, methods=["get"])
    def trend(self, request):
        """월별/년도별 트렌드 분석"""
        qs = self.get_queryset().filter(status="won")
        
        # 최근 12개월 월별 수주
        today = timezone.now().date()
        twelve_months_ago = today - relativedelta(months=12)
        
        monthly = qs.filter(
            updated_at__date__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth("updated_at")
        ).values("month").annotate(
            count=Count("id"),
            amount=Sum("expected_amount")
        ).order_by("month")
        
        # 년도별 수주 (최근 3년)
        yearly = qs.annotate(
            year=ExtractYear("updated_at")
        ).values("year").annotate(
            count=Count("id"),
            amount=Sum("expected_amount")
        ).order_by("-year")[:3]
        
        # YoY 증감률
        current_year = today.year
        current_year_total = qs.filter(
            updated_at__year=current_year
        ).aggregate(amount=Sum("expected_amount"))["amount"] or 0
        
        last_year_total = qs.filter(
            updated_at__year=current_year - 1
        ).aggregate(amount=Sum("expected_amount"))["amount"] or 0
        
        yoy_change = 0
        if last_year_total > 0:
            yoy_change = ((current_year_total - last_year_total) / last_year_total) * 100
        
        return Response({
            "monthly": list(monthly),
            "yearly": list(yearly),
            "yoy": {
                "current_year": current_year,
                "current_amount": current_year_total,
                "last_year_amount": last_year_total,
                "change_percent": round(yoy_change, 2)
            }
        })


class QuoteTemplateViewSet(viewsets.ModelViewSet):
    """견적 템플릿 ViewSet"""
    queryset = QuoteTemplate.objects.all()
    serializer_class = QuoteTemplateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def default(self, request):
        """기본 템플릿 조회"""
        template = QuoteTemplate.objects.filter(is_default=True).first()
        if template:
            return Response(QuoteTemplateSerializer(template).data)
        return Response({"detail": "기본 템플릿이 없습니다."}, status=404)


class EstimateViewSet(viewsets.ModelViewSet):
    """견적 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Estimate.objects.select_related(
            "opportunity", "opportunity__client", "created_by", "template"
        ).prefetch_related("items")
        
        # 기회 필터
        opportunity = self.request.query_params.get("opportunity")
        if opportunity:
            qs = qs.filter(opportunity_id=opportunity)
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 최신 버전만
        latest_only = self.request.query_params.get("latest_only")
        if latest_only == "true":
            # 각 기회별 가장 높은 버전만
            qs = qs.filter(is_final=True) | qs.filter(
                parent_estimate__isnull=True
            ).order_by("opportunity", "-version").distinct("opportunity")
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return EstimateListSerializer
        return EstimateDetailSerializer

    def perform_create(self, serializer):
        # 견적번호 자동 생성
        today = timezone.now()
        prefix = f"EST-{today.strftime('%Y%m%d')}"
        last = Estimate.objects.filter(
            estimate_number__startswith=prefix
        ).order_by("-estimate_number").first()
        
        if last:
            try:
                seq = int(last.estimate_number.split("-")[-1]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        estimate_number = f"{prefix}-{seq:03d}"
        
        serializer.save(
            created_by=self.request.user,
            estimate_number=estimate_number
        )

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

    @action(detail=True, methods=["post"])
    def create_version(self, request, pk=None):
        """새 버전 생성"""
        estimate = self.get_object()
        new_estimate = estimate.create_new_version(request.user)
        return Response(
            EstimateDetailSerializer(new_estimate).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def set_final(self, request, pk=None):
        """최종 승인본으로 설정"""
        estimate = self.get_object()
        # 같은 기회의 다른 견적 is_final 해제
        Estimate.objects.filter(
            opportunity=estimate.opportunity
        ).update(is_final=False)
        estimate.is_final = True
        estimate.save(update_fields=["is_final"])
        return Response({"status": "success"})

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """버전 히스토리 조회"""
        estimate = self.get_object()
        # 같은 기회의 모든 견적 버전
        all_versions = Estimate.objects.filter(
            opportunity=estimate.opportunity
        ).order_by("-version")
        return Response(EstimateListSerializer(all_versions, many=True).data)

    def _recalculate_total(self, estimate):
        subtotal = estimate.items.aggregate(total=Sum("amount"))["total"] or 0
        tax = int(subtotal * 0.1)
        estimate.subtotal = subtotal
        estimate.tax = tax
        estimate.total = subtotal + tax
        estimate.save(update_fields=["subtotal", "tax", "total"])


class ContractViewSet(viewsets.ModelViewSet):
    """계약 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Contract.objects.select_related(
            "client", "opportunity", "created_by"
        ).prefetch_related("billing_schedules", "invoices")
        
        # 상태 필터
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 거래처 필터
        client = self.request.query_params.get("client")
        if client:
            qs = qs.filter(client_id=client)
        
        # 계약 유형 필터
        contract_type = self.request.query_params.get("contract_type")
        if contract_type:
            qs = qs.filter(contract_type=contract_type)
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ContractListSerializer
        return ContractDetailSerializer

    def perform_create(self, serializer):
        # 계약번호 자동 생성
        today = timezone.now()
        prefix = f"CON-{today.strftime('%Y%m%d')}"
        last = Contract.objects.filter(
            contract_number__startswith=prefix
        ).order_by("-contract_number").first()
        
        if last:
            try:
                seq = int(last.contract_number.split("-")[-1]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        contract_number = f"{prefix}-{seq:03d}"
        
        serializer.save(
            created_by=self.request.user,
            contract_number=contract_number
        )

    @action(detail=True, methods=["post"])
    def generate_billing_schedule(self, request, pk=None):
        """청구 스케줄 자동 생성"""
        contract = self.get_object()
        
        if not contract.start_date or not contract.end_date:
            return Response(
                {"error": "계약 시작일과 종료일이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 스케줄 삭제
        contract.billing_schedules.all().delete()
        
        schedules = []
        
        if contract.billing_cycle == "one_time":
            # 일시불
            schedules.append(BillingSchedule(
                contract=contract,
                scheduled_date=contract.start_date,
                amount=contract.amount,
                description="일시불"
            ))
        
        elif contract.billing_cycle == "monthly":
            # 월별
            current_date = contract.start_date
            months = 0
            total_months = (
                (contract.end_date.year - contract.start_date.year) * 12 +
                (contract.end_date.month - contract.start_date.month) + 1
            )
            monthly_amount = contract.amount // total_months
            
            while current_date <= contract.end_date:
                schedules.append(BillingSchedule(
                    contract=contract,
                    scheduled_date=current_date,
                    amount=monthly_amount,
                    description=f"{months + 1}차 청구"
                ))
                current_date = current_date + relativedelta(months=1)
                months += 1
        
        elif contract.billing_cycle == "quarterly":
            # 분기별
            current_date = contract.start_date
            quarter = 0
            total_quarters = (
                (contract.end_date.year - contract.start_date.year) * 4 +
                ((contract.end_date.month - 1) // 3 - (contract.start_date.month - 1) // 3) + 1
            )
            quarterly_amount = contract.amount // max(total_quarters, 1)
            
            while current_date <= contract.end_date:
                schedules.append(BillingSchedule(
                    contract=contract,
                    scheduled_date=current_date,
                    amount=quarterly_amount,
                    description=f"{quarter + 1}분기 청구"
                ))
                current_date = current_date + relativedelta(months=3)
                quarter += 1
        
        BillingSchedule.objects.bulk_create(schedules)
        
        return Response({
            "created": len(schedules),
            "schedules": BillingScheduleSerializer(schedules, many=True).data
        })


class BillingScheduleViewSet(viewsets.ModelViewSet):
    """청구 스케줄 ViewSet"""
    queryset = BillingSchedule.objects.select_related("contract", "contract__client")
    serializer_class = BillingScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        
        contract = self.request.query_params.get("contract")
        if contract:
            qs = qs.filter(contract_id=contract)
        
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 기간 필터
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            qs = qs.filter(scheduled_date__gte=start_date)
        if end_date:
            qs = qs.filter(scheduled_date__lte=end_date)
        
        return qs

    @action(detail=True, methods=["post"])
    def create_invoice(self, request, pk=None):
        """청구서 생성"""
        schedule = self.get_object()
        
        # 청구번호 생성
        today = timezone.now()
        prefix = f"INV-{today.strftime('%Y%m%d')}"
        last = Invoice.objects.filter(
            invoice_number__startswith=prefix
        ).order_by("-invoice_number").first()
        
        if last:
            try:
                seq = int(last.invoice_number.split("-")[-1]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        invoice_number = f"{prefix}-{seq:03d}"
        
        # 납부 기한 (30일 후)
        due_date = today.date() + timedelta(days=30)
        
        subtotal = schedule.amount
        tax = int(subtotal * 0.1)
        
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            contract=schedule.contract,
            billing_schedule=schedule,
            due_date=due_date,
            subtotal=subtotal,
            tax=tax,
            total=subtotal + tax,
            created_by=request.user
        )
        
        # 스케줄 상태 업데이트
        schedule.status = "invoiced"
        schedule.save(update_fields=["status"])
        
        return Response(
            InvoiceDetailSerializer(invoice).data,
            status=status.HTTP_201_CREATED
        )


class InvoiceViewSet(viewsets.ModelViewSet):
    """청구서 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related(
            "contract", "contract__client", "billing_schedule", "created_by"
        ).prefetch_related("payments")
        
        contract = self.request.query_params.get("contract")
        if contract:
            qs = qs.filter(contract_id=contract)
        
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # 연체만
        overdue = self.request.query_params.get("overdue")
        if overdue == "true":
            qs = qs.filter(
                status__in=["sent", "partial"],
                due_date__lt=timezone.now().date()
            )
        
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return InvoiceListSerializer
        return InvoiceDetailSerializer

    def perform_create(self, serializer):
        # 청구번호 자동 생성
        today = timezone.now()
        prefix = f"INV-{today.strftime('%Y%m%d')}"
        last = Invoice.objects.filter(
            invoice_number__startswith=prefix
        ).order_by("-invoice_number").first()
        
        if last:
            try:
                seq = int(last.invoice_number.split("-")[-1]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        invoice_number = f"{prefix}-{seq:03d}"
        
        serializer.save(
            created_by=self.request.user,
            invoice_number=invoice_number
        )

    @action(detail=False, methods=["get"])
    def receivable_summary(self, request):
        """미수금 현황 요약"""
        qs = self.get_queryset().exclude(status__in=["paid", "cancelled"])
        
        # 거래처별 미수금
        by_client = qs.values(
            "contract__client__id",
            "contract__client__name"
        ).annotate(
            invoice_count=Count("id"),
            total_amount=Sum("total"),
        )
        
        # 수동으로 미수금 계산 (balance property 사용 불가)
        result = []
        for item in by_client:
            client_invoices = qs.filter(contract__client_id=item["contract__client__id"])
            total_balance = 0
            overdue_count = 0
            for inv in client_invoices:
                total_balance += inv.balance
                if inv.overdue_days > 0:
                    overdue_count += 1
            
            result.append({
                "client_id": item["contract__client__id"],
                "client_name": item["contract__client__name"],
                "invoice_count": item["invoice_count"],
                "total_amount": item["total_amount"],
                "total_balance": total_balance,
                "overdue_count": overdue_count
            })
        
        # 전체 합계
        total_balance = sum(item["total_balance"] for item in result)
        total_overdue = sum(item["overdue_count"] for item in result)
        
        return Response({
            "by_client": result,
            "summary": {
                "total_balance": total_balance,
                "total_overdue_count": total_overdue,
                "client_count": len(result)
            }
        })


class PaymentViewSet(viewsets.ModelViewSet):
    """수금 기록 ViewSet"""
    queryset = Payment.objects.select_related(
        "invoice", "invoice__contract", "invoice__contract__client", "created_by"
    )
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        
        invoice = self.request.query_params.get("invoice")
        if invoice:
            qs = qs.filter(invoice_id=invoice)
        
        # 기간 필터
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)
        
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DashboardViewSet(viewsets.ViewSet):
    """대시보드 통합 API"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """대시보드 요약 데이터"""
        today = timezone.now().date()
        this_month = today.replace(day=1)
        
        # 거래처 수
        client_count = Client.objects.count()
        
        # 진행중 파이프라인
        pipeline = SalesOpportunity.objects.exclude(
            status__in=["won", "lost"]
        ).aggregate(
            count=Count("id"),
            total=Sum("expected_amount")
        )
        
        # 이번 달 수주
        won_this_month = SalesOpportunity.objects.filter(
            status="won",
            updated_at__date__gte=this_month
        ).aggregate(
            count=Count("id"),
            amount=Sum("expected_amount")
        )
        
        # 미수금 합계
        unpaid_invoices = Invoice.objects.exclude(
            status__in=["paid", "cancelled"]
        )
        total_receivable = sum(inv.balance for inv in unpaid_invoices)
        overdue_count = sum(1 for inv in unpaid_invoices if inv.overdue_days > 0)
        
        return Response({
            "client_count": client_count,
            "pipeline": pipeline,
            "won_this_month": won_this_month,
            "receivable": {
                "total": total_receivable,
                "overdue_count": overdue_count
            }
        })
