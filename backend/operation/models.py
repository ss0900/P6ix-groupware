# backend/operation/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date


class Client(models.Model):
    """거래처/고객사 - 계층 구조 지원 (법인-부서)"""
    name = models.CharField("회사명", max_length=200)
    representative = models.CharField("대표자", max_length=100, blank=True)
    business_number = models.CharField("사업자번호", max_length=20, blank=True)
    industry = models.CharField("업종", max_length=100, blank=True)
    
    # 계층 구조
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="children", verbose_name="상위 거래처"
    )
    
    # 연락처
    phone = models.CharField("전화번호", max_length=20, blank=True)
    fax = models.CharField("팩스", max_length=20, blank=True)
    email = models.EmailField("이메일", blank=True)
    address = models.CharField("주소", max_length=300, blank=True)
    
    # 담당자
    contact_name = models.CharField("담당자명", max_length=100, blank=True)
    contact_phone = models.CharField("담당자 연락처", max_length=20, blank=True)
    contact_email = models.EmailField("담당자 이메일", blank=True)
    
    # 메모
    notes = models.TextField("메모", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_clients", verbose_name="등록자"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "거래처"
        verbose_name_plural = "거래처"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def get_descendants(self, include_self=False):
        """하위 부서 전체 조회 (재귀)"""
        descendants = []
        if include_self:
            descendants.append(self)
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_descendants(include_self=False))
        return descendants

    def get_all_opportunities(self):
        """자신과 하위 부서의 모든 영업 기회"""
        all_clients = [self] + self.get_descendants()
        return SalesOpportunity.objects.filter(client__in=all_clients)

    def get_all_contracts(self):
        """자신과 하위 부서의 모든 계약"""
        all_clients = [self] + self.get_descendants()
        return Contract.objects.filter(client__in=all_clients)


class SalesOpportunity(models.Model):
    """영업 기회"""
    STATUS_CHOICES = [
        ("lead", "리드"),
        ("contact", "접촉"),
        ("proposal", "제안"),
        ("negotiation", "협상"),
        ("won", "수주"),
        ("lost", "실패"),
    ]
    PRIORITY_CHOICES = [
        ("low", "낮음"),
        ("medium", "보통"),
        ("high", "높음"),
    ]

    title = models.CharField("건명", max_length=200)
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE,
        related_name="opportunities", verbose_name="거래처"
    )
    
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="lead")
    priority = models.CharField("우선순위", max_length=20, choices=PRIORITY_CHOICES, default="medium")
    
    # 금액
    expected_amount = models.DecimalField("예상 금액", max_digits=15, decimal_places=0, default=0)
    probability = models.PositiveIntegerField("성공 확률 (%)", default=50)
    
    # 일정
    expected_close_date = models.DateField("예상 마감일", null=True, blank=True)
    
    # 담당
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="opportunities", verbose_name="담당자"
    )
    
    description = models.TextField("설명", blank=True)
    
    # Next Step (정체 상태 판단용)
    next_step = models.TextField("다음 단계", blank=True)
    next_step_date = models.DateField("다음 단계 예정일", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "영업 기회"
        verbose_name_plural = "영업 기회"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"

    @property
    def weighted_amount(self):
        """가중치 적용 금액"""
        return self.expected_amount * self.probability / 100

    @property
    def is_stagnant(self):
        """정체 상태 여부 - next_step이 비어있고 진행 중인 상태"""
        if self.status in ["won", "lost"]:
            return False
        return not self.next_step.strip()


class QuoteTemplate(models.Model):
    """견적서 템플릿"""
    name = models.CharField("템플릿명", max_length=100)
    description = models.TextField("설명", blank=True)
    
    # 컬럼 설정 (JSONField)
    # 예: {"columns": [{"key": "description", "label": "품목", "visible": true, "order": 1}, ...]}
    column_config = models.JSONField("컬럼 설정", default=dict)
    
    # 기본 템플릿 여부
    is_default = models.BooleanField("기본 템플릿", default=False)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_quote_templates", verbose_name="작성자"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "견적 템플릿"
        verbose_name_plural = "견적 템플릿"
        ordering = ["-is_default", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # 기본 템플릿이 하나만 있도록
        if self.is_default:
            QuoteTemplate.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Estimate(models.Model):
    """견적"""
    STATUS_CHOICES = [
        ("draft", "작성중"),
        ("sent", "발송"),
        ("accepted", "수락"),
        ("rejected", "거절"),
        ("expired", "만료"),
    ]

    estimate_number = models.CharField("견적번호", max_length=50, unique=True)
    opportunity = models.ForeignKey(
        SalesOpportunity, on_delete=models.CASCADE,
        related_name="estimates", verbose_name="영업 기회"
    )
    
    # 템플릿
    template = models.ForeignKey(
        QuoteTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="estimates", verbose_name="템플릿"
    )
    
    title = models.CharField("견적 제목", max_length=200)
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    
    # 버전닝
    version = models.PositiveIntegerField("버전", default=1)
    is_final = models.BooleanField("최종 승인본", default=False)
    parent_estimate = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name="revisions", verbose_name="이전 버전"
    )
    
    # 금액
    subtotal = models.DecimalField("공급가액", max_digits=15, decimal_places=0, default=0)
    tax = models.DecimalField("세액", max_digits=15, decimal_places=0, default=0)
    total = models.DecimalField("합계", max_digits=15, decimal_places=0, default=0)
    
    # 유효기간
    valid_until = models.DateField("유효기간", null=True, blank=True)
    
    notes = models.TextField("비고", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_estimates", verbose_name="작성자"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "견적"
        verbose_name_plural = "견적"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.estimate_number} v{self.version} - {self.title}"

    def create_new_version(self, user):
        """새 버전 생성"""
        new_estimate = Estimate.objects.create(
            opportunity=self.opportunity,
            template=self.template,
            title=self.title,
            version=self.version + 1,
            parent_estimate=self,
            valid_until=self.valid_until,
            notes=self.notes,
            created_by=user,
            estimate_number=f"{self.estimate_number.rsplit('-v', 1)[0]}-v{self.version + 1}"
        )
        # 항목 복사
        for item in self.items.all():
            EstimateItem.objects.create(
                estimate=new_estimate,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.amount,
                order=item.order
            )
        return new_estimate


class EstimateItem(models.Model):
    """견적 항목"""
    estimate = models.ForeignKey(
        Estimate, on_delete=models.CASCADE,
        related_name="items", verbose_name="견적"
    )
    description = models.CharField("품목", max_length=200)
    specification = models.CharField("규격", max_length=200, blank=True)
    unit = models.CharField("단위", max_length=20, default="EA")
    quantity = models.PositiveIntegerField("수량", default=1)
    unit_price = models.DecimalField("단가", max_digits=15, decimal_places=0, default=0)
    amount = models.DecimalField("금액", max_digits=15, decimal_places=0, default=0)
    remark = models.CharField("비고", max_length=200, blank=True)
    order = models.PositiveIntegerField("순서", default=0)

    class Meta:
        verbose_name = "견적 항목"
        verbose_name_plural = "견적 항목"
        ordering = ["order"]

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Contract(models.Model):
    """계약"""
    STATUS_CHOICES = [
        ("draft", "작성중"),
        ("pending", "검토중"),
        ("active", "진행중"),
        ("completed", "완료"),
        ("terminated", "해지"),
    ]
    CONTRACT_TYPE_CHOICES = [
        ("short_term", "단기"),
        ("long_term", "장기"),
    ]
    BILLING_CYCLE_CHOICES = [
        ("one_time", "일시불"),
        ("monthly", "월별"),
        ("quarterly", "분기별"),
        ("milestone", "마일스톤"),
    ]

    contract_number = models.CharField("계약번호", max_length=50, unique=True)
    opportunity = models.ForeignKey(
        SalesOpportunity, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="contracts", verbose_name="영업 기회"
    )
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE,
        related_name="contracts", verbose_name="거래처"
    )
    
    title = models.CharField("계약 제목", max_length=200)
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    
    # 계약 유형
    contract_type = models.CharField(
        "계약 유형", max_length=20, 
        choices=CONTRACT_TYPE_CHOICES, default="short_term"
    )
    billing_cycle = models.CharField(
        "청구 주기", max_length=20,
        choices=BILLING_CYCLE_CHOICES, default="one_time"
    )
    
    # 금액
    amount = models.DecimalField("계약 금액", max_digits=15, decimal_places=0, default=0)
    
    # 기간
    start_date = models.DateField("시작일", null=True, blank=True)
    end_date = models.DateField("종료일", null=True, blank=True)
    
    notes = models.TextField("비고", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_contracts", verbose_name="작성자"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "계약"
        verbose_name_plural = "계약"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contract_number} - {self.title}"


class BillingSchedule(models.Model):
    """청구 스케줄"""
    STATUS_CHOICES = [
        ("scheduled", "예정"),
        ("invoiced", "청구됨"),
        ("paid", "완납"),
        ("partial", "부분납"),
        ("overdue", "연체"),
    ]

    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE,
        related_name="billing_schedules", verbose_name="계약"
    )
    
    scheduled_date = models.DateField("청구 예정일")
    amount = models.DecimalField("청구 예정 금액", max_digits=15, decimal_places=0)
    description = models.CharField("설명", max_length=200, blank=True)
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="scheduled")
    
    # 마일스톤 관련
    milestone_name = models.CharField("마일스톤명", max_length=100, blank=True)
    milestone_percentage = models.PositiveIntegerField("마일스톤 비율 (%)", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "청구 스케줄"
        verbose_name_plural = "청구 스케줄"
        ordering = ["scheduled_date"]

    def __str__(self):
        return f"{self.contract.contract_number} - {self.scheduled_date}"


class Invoice(models.Model):
    """청구서"""
    STATUS_CHOICES = [
        ("draft", "작성중"),
        ("sent", "발송"),
        ("partial", "부분납"),
        ("paid", "완납"),
        ("overdue", "연체"),
        ("cancelled", "취소"),
    ]

    invoice_number = models.CharField("청구번호", max_length=50, unique=True)
    contract = models.ForeignKey(
        Contract, on_delete=models.CASCADE,
        related_name="invoices", verbose_name="계약"
    )
    billing_schedule = models.ForeignKey(
        BillingSchedule, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="invoices", verbose_name="청구 스케줄"
    )
    
    issue_date = models.DateField("발행일", default=date.today)
    due_date = models.DateField("납부 기한")
    
    # 금액
    subtotal = models.DecimalField("공급가액", max_digits=15, decimal_places=0, default=0)
    tax = models.DecimalField("세액", max_digits=15, decimal_places=0, default=0)
    total = models.DecimalField("합계", max_digits=15, decimal_places=0, default=0)
    
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    
    notes = models.TextField("비고", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_invoices", verbose_name="작성자"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "청구서"
        verbose_name_plural = "청구서"
        ordering = ["-issue_date"]

    def __str__(self):
        return f"{self.invoice_number} - {self.contract.client.name}"

    @property
    def paid_amount(self):
        """수금 완료 금액"""
        return self.payments.aggregate(total=models.Sum('amount'))['total'] or 0

    @property
    def balance(self):
        """미수금"""
        return self.total - self.paid_amount

    @property
    def overdue_days(self):
        """연체 일수"""
        if self.status in ["paid", "cancelled"]:
            return 0
        today = date.today()
        if today > self.due_date:
            return (today - self.due_date).days
        return 0

    def update_status(self):
        """결제 상태 자동 업데이트"""
        if self.status == "cancelled":
            return
        
        paid = self.paid_amount
        if paid >= self.total:
            self.status = "paid"
        elif paid > 0:
            self.status = "partial"
        elif date.today() > self.due_date:
            self.status = "overdue"
        self.save(update_fields=["status"])


class Payment(models.Model):
    """수금 기록"""
    PAYMENT_METHOD_CHOICES = [
        ("bank_transfer", "계좌이체"),
        ("cash", "현금"),
        ("card", "카드"),
        ("check", "수표"),
        ("other", "기타"),
    ]

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE,
        related_name="payments", verbose_name="청구서"
    )
    
    payment_date = models.DateField("입금일")
    amount = models.DecimalField("입금액", max_digits=15, decimal_places=0)
    payment_method = models.CharField(
        "결제 방법", max_length=20,
        choices=PAYMENT_METHOD_CHOICES, default="bank_transfer"
    )
    
    reference = models.CharField("참조번호", max_length=100, blank=True)
    notes = models.TextField("메모", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_payments", verbose_name="등록자"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "수금 기록"
        verbose_name_plural = "수금 기록"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.amount:,}원"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # 청구서 상태 업데이트
        self.invoice.update_status()
