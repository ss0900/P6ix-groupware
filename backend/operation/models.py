# backend/operation/models.py
"""
영업관리(Operation) 모듈 - Models
영업 흐름: 문의/의뢰 → 영업 → 견적 → 계약 → 정산
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import Company  # ✅ workspace 스코프


# ============================================================
# 고객 관리
# ============================================================
class CustomerCompany(models.Model):
    """고객사(회사) 마스터"""
    STATUS_CHOICES = (
        ("prospect", "잠재"),
        ("active", "진행"),
        ("deal", "거래"),
        ("inactive", "중단"),
    )
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_customer_companies",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,  # ✅ 1차는 nullable로 넣고 데이터 백필 후 NOT NULL 추천
    )
    name = models.CharField("회사명", max_length=200)
    business_number = models.CharField("사업자번호", max_length=20, blank=True)
    industry = models.CharField("업종", max_length=100, blank=True)
    address = models.TextField("주소", blank=True)
    phone = models.CharField("대표전화", max_length=20, blank=True)
    website = models.URLField("웹사이트", blank=True)
    notes = models.TextField("메모", blank=True)
    status = models.CharField(
        "상태", max_length=20,
        choices=STATUS_CHOICES, default="prospect"
    )
    tags = models.JSONField("태그", default=list, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="owned_customer_companies",
        verbose_name="담당자"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_customer_companies",
        verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "고객사"
        verbose_name_plural = "고객사 목록"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["workspace", "name"]),
        ]

    def __str__(self):
        return self.name


class CustomerContact(models.Model):
    """고객 담당자(개인)"""
    company = models.ForeignKey(
        CustomerCompany, on_delete=models.CASCADE,
        related_name="contacts", verbose_name="소속 회사"
    )
    name = models.CharField("이름", max_length=50)
    position = models.CharField("직위/직책", max_length=50, blank=True)
    department = models.CharField("부서", max_length=100, blank=True)
    email = models.EmailField("이메일", blank=True)
    phone = models.CharField("전화번호", max_length=20, blank=True)
    mobile = models.CharField("휴대전화", max_length=20, blank=True)
    is_primary = models.BooleanField("주 담당자", default=False)
    notes = models.TextField("메모", blank=True)
    
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "고객 담당자"
        verbose_name_plural = "고객 담당자 목록"
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


# ============================================================
# 파이프라인 / 단계
# ============================================================
class SalesPipeline(models.Model):
    """파이프라인(업무유형별)"""
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_pipelines",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    name = models.CharField("파이프라인명", max_length=100)
    description = models.TextField("설명", blank=True)
    is_default = models.BooleanField("기본 파이프라인", default=False)
    is_active = models.BooleanField("활성화", default=True)
    
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "파이프라인"
        verbose_name_plural = "파이프라인 목록"
        ordering = ['-is_default', 'name']
        indexes = [
            models.Index(fields=["workspace", "name"]),
        ]

    def __str__(self):
        return self.name


class SalesStage(models.Model):
    """영업 단계"""
    STAGE_TYPE_CHOICES = (
        ('open', '진행중'),
        ('won', '수주'),
        ('lost', '실주'),
    )
    
    pipeline = models.ForeignKey(
        SalesPipeline, on_delete=models.CASCADE,
        related_name="stages", verbose_name="파이프라인"
    )
    name = models.CharField("단계명", max_length=50)
    order = models.PositiveIntegerField("순서", default=0)
    stage_type = models.CharField(
        "단계 유형", max_length=10,
        choices=STAGE_TYPE_CHOICES, default='open'
    )
    probability = models.PositiveIntegerField("기본 확률(%)", default=0)
    color = models.CharField("색상", max_length=20, default="#3B82F6")
    
    created_at = models.DateTimeField("등록일", auto_now_add=True)

    class Meta:
        verbose_name = "영업 단계"
        verbose_name_plural = "영업 단계 목록"
        ordering = ['pipeline', 'order']
        unique_together = ['pipeline', 'order']

    def __str__(self):
        return f"{self.pipeline.name} - {self.name}"


# ============================================================
# 영업 기회 (Lead)
# ============================================================
class SalesLead(models.Model):
    """영업기회(의뢰/문의 단위)"""
    STATUS_CHOICES = (
        ('active', '진행중'),
        ('won', '수주'),
        ('lost', '실주'),
    )
    
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_leads",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    # 파이프라인/단계
    pipeline = models.ForeignKey(
        SalesPipeline, on_delete=models.PROTECT,
        related_name="leads", verbose_name="파이프라인"
    )
    stage = models.ForeignKey(
        SalesStage, on_delete=models.PROTECT,
        related_name="leads", verbose_name="현재 단계"
    )
    
    # 기본 정보
    title = models.CharField("제목(현장/프로젝트명)", max_length=200)
    description = models.TextField("설명", blank=True)
    
    # 고객 연결
    company = models.ForeignKey(
        CustomerCompany, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="leads",
        verbose_name="고객사"
    )
    contact = models.ForeignKey(
        CustomerContact, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="leads",
        verbose_name="담당자"
    )
    
    # 금액/일정
    expected_amount = models.DecimalField(
        "예상금액", max_digits=15, decimal_places=0,
        null=True, blank=True
    )
    expected_close_date = models.DateField("예상마감일", null=True, blank=True)
    
    # 담당자
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="owned_leads",
        verbose_name="담당자"
    )
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name="assigned_leads",
        verbose_name="협업자"
    )
    
    # 상태/확률
    status = models.CharField(
        "상태", max_length=10,
        choices=STATUS_CHOICES, default='active'
    )
    probability = models.PositiveIntegerField("확률(%)", default=0)
    lost_reason = models.TextField("실주 사유", blank=True)
    
    # 추적 필드
    stage_entered_at = models.DateTimeField("단계 진입일", default=timezone.now)
    last_contacted_at = models.DateTimeField("최근 접촉일", null=True, blank=True)
    next_action_due_at = models.DateTimeField("다음 액션 예정일", null=True, blank=True)
    
    # 연결 (향후 확장)
    contract_id = models.IntegerField("계약 ID", null=True, blank=True)
    project_id = models.IntegerField("프로젝트 ID", null=True, blank=True)
    
    # 메타
    source = models.CharField("유입 경로", max_length=100, blank=True)
    utm = models.JSONField("UTM", null=True, blank=True)
    tags = models.JSONField("태그", default=list, blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_leads",
        verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "영업기회"
        verbose_name_plural = "영업기회 목록"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["workspace", "status", "created_at"]),
            models.Index(fields=["workspace", "expected_close_date"]),
        ]

    def __str__(self):
        return self.title

    @property
    def stalled_days(self):
        """현재 단계에서 정체된 일수"""
        cached = self.__dict__.get("_stalled_days")
        if cached is not None:
            return cached
        if self.stage_entered_at:
            delta = timezone.now() - self.stage_entered_at
            return delta.days
        return 0

    @stalled_days.setter
    def stalled_days(self, value):
        self.__dict__["_stalled_days"] = value

    @property
    def is_stalled(self):
        """7일 이상 정체 여부"""
        return self.stalled_days >= 7


# ============================================================
# 활동 로그 (Activity)
# ============================================================
class LeadActivity(models.Model):
    """활동 로그(타임라인)"""
    ACTIVITY_TYPE_CHOICES = (
        ('note', '메모'),
        ('call', '전화'),
        ('email', '이메일'),
        ('meeting', '미팅'),
        ('stage_change', '단계변경'),
        ('quote_created', '견적생성'),
        ('quote_sent', '견적발송'),
        ('file_added', '파일추가'),
        ('task_done', 'TODO완료'),
        ('won', '수주'),
        ('lost', '실주'),
        ('created', '생성'),
    )
    
    lead = models.ForeignKey(
        SalesLead, on_delete=models.CASCADE,
        related_name="activities", verbose_name="영업기회"
    )
    activity_type = models.CharField(
        "활동 유형", max_length=20,
        choices=ACTIVITY_TYPE_CHOICES
    )
    title = models.CharField("제목", max_length=200)
    content = models.TextField("내용", blank=True)
    
    # 단계 변경 시 이전/이후 단계
    from_stage = models.ForeignKey(
        SalesStage, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
        verbose_name="이전 단계"
    )
    to_stage = models.ForeignKey(
        SalesStage, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
        verbose_name="이후 단계"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="작성자"
    )
    created_at = models.DateTimeField("작성일", auto_now_add=True)

    class Meta:
        verbose_name = "활동 로그"
        verbose_name_plural = "활동 로그 목록"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.lead.title} - {self.get_activity_type_display()}"


# ============================================================
# TODO / 할일
# ============================================================
class LeadTask(models.Model):
    """리드별 할 일(TODO)"""
    PRIORITY_CHOICES = (
        ('low', '낮음'),
        ('medium', '보통'),
        ('high', '높음'),
    )
    
    lead = models.ForeignKey(
        SalesLead, on_delete=models.CASCADE,
        related_name="tasks", verbose_name="영업기회"
    )
    title = models.CharField("제목", max_length=200)
    description = models.TextField("설명", blank=True)
    
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="lead_tasks",
        verbose_name="담당자"
    )
    due_date = models.DateTimeField("기한", null=True, blank=True)
    priority = models.CharField(
        "우선순위", max_length=10,
        choices=PRIORITY_CHOICES, default='medium'
    )
    
    is_completed = models.BooleanField("완료", default=False)
    completed_at = models.DateTimeField("완료일", null=True, blank=True)
    
    show_on_calendar = models.BooleanField("캘린더 표시", default=True)
    reminder_at = models.DateTimeField("알림 시간", null=True, blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_lead_tasks",
        verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "할 일"
        verbose_name_plural = "할 일 목록"
        ordering = ['is_completed', 'due_date', '-priority']

    def __str__(self):
        return self.title


# ============================================================
# 첨부파일
# ============================================================
def lead_file_path(instance, filename):
    """리드 첨부파일 저장 경로"""
    return f"operation/leads/{instance.lead.id}/{filename}"


class LeadFile(models.Model):
    """리드 첨부파일"""
    lead = models.ForeignKey(
        SalesLead, on_delete=models.CASCADE,
        related_name="files", verbose_name="영업기회"
    )
    file = models.FileField("파일", upload_to=lead_file_path)
    name = models.CharField("파일명", max_length=255)
    size = models.PositiveIntegerField("파일 크기", default=0)
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="업로더"
    )
    created_at = models.DateTimeField("업로드일", auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일 목록"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# ============================================================
# 견적서
# ============================================================
class QuoteTemplate(models.Model):
    """견적 템플릿"""
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_quote_templates",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    name = models.CharField("템플릿명", max_length=100)
    header_text = models.TextField("머리말", blank=True)
    footer_text = models.TextField("꼬리말", blank=True)
    terms = models.TextField("거래조건", blank=True)
    is_default = models.BooleanField("기본 템플릿", default=False)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "견적 템플릿"
        verbose_name_plural = "견적 템플릿 목록"
        ordering = ['-is_default', 'name']

    def __str__(self):
        return self.name


class Quote(models.Model):
    """견적서"""
    STATUS_CHOICES = (
        ('draft', '작성중'),
        ('sent', '발송됨'),
        ('accepted', '수락'),
        ('rejected', '거절'),
        ('expired', '만료'),
    )
    
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_quotes",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.CASCADE,
        related_name="quotes", verbose_name="영업기회"
    )
    company = models.ForeignKey(
        CustomerCompany, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="고객사"
    )
    contact = models.ForeignKey(
        CustomerContact, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="담당자"
    )
    
    quote_number = models.CharField("견적번호", max_length=50, unique=True)
    title = models.CharField("견적 제목", max_length=200)
    
    # 템플릿 정보
    template = models.ForeignKey(
        QuoteTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name="템플릿"
    )
    header_text = models.TextField("머리말", blank=True)
    footer_text = models.TextField("꼬리말", blank=True)
    terms = models.TextField("거래조건", blank=True)
    
    # 금액
    subtotal = models.DecimalField(
        "공급가액", max_digits=15, decimal_places=0, default=0
    )
    tax_rate = models.DecimalField(
        "세율(%)", max_digits=5, decimal_places=2, default=10
    )
    tax_amount = models.DecimalField(
        "세액", max_digits=15, decimal_places=0, default=0
    )
    total_amount = models.DecimalField(
        "총액", max_digits=15, decimal_places=0, default=0
    )
    
    # 유효기간
    valid_until = models.DateField("견적 유효일", null=True, blank=True)
    
    status = models.CharField(
        "상태", max_length=10,
        choices=STATUS_CHOICES, default='draft'
    )
    sent_at = models.DateTimeField("발송일", null=True, blank=True)
    
    notes = models.TextField("비고", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="작성자"
    )
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "견적서"
        verbose_name_plural = "견적서 목록"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quote_number} - {self.title}"

    def calculate_totals(self):
        """아이템 기준으로 합계 계산"""
        items = self.items.all()
        self.subtotal = sum(item.amount for item in items)
        self.tax_amount = int(self.subtotal * self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount
        self.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])


class QuoteItem(models.Model):
    """견적 라인 아이템"""
    quote = models.ForeignKey(
        Quote, on_delete=models.CASCADE,
        related_name="items", verbose_name="견적서"
    )
    order = models.PositiveIntegerField("순서", default=0)
    
    name = models.CharField("품목명", max_length=200)
    description = models.TextField("상세설명", blank=True)
    specification = models.CharField("규격", max_length=100, blank=True)
    unit = models.CharField("단위", max_length=20, default="식")
    
    quantity = models.DecimalField(
        "수량", max_digits=10, decimal_places=2, default=1
    )
    unit_price = models.DecimalField(
        "단가", max_digits=15, decimal_places=0, default=0
    )
    amount = models.DecimalField(
        "금액", max_digits=15, decimal_places=0, default=0
    )
    
    notes = models.CharField("비고", max_length=200, blank=True)

    class Meta:
        verbose_name = "견적 항목"
        verbose_name_plural = "견적 항목 목록"
        ordering = ['quote', 'order']

    def __str__(self):
        return f"{self.quote.quote_number} - {self.name}"

    def save(self, *args, **kwargs):
        # 금액 자동 계산
        self.amount = int(self.quantity * self.unit_price)
        super().save(*args, **kwargs)


# ============================================================
# 계약 연결
# ============================================================
class SalesContractLink(models.Model):
    """영업기회 - 계약 연결"""
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_contract_links",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.CASCADE,
        related_name="contract_links", verbose_name="영업기회"
    )
    contract_id = models.IntegerField("계약 ID")
    notes = models.TextField("비고", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)

    class Meta:
        verbose_name = "계약 연결"
        verbose_name_plural = "계약 연결 목록"
        ordering = ["-created_at"]
        unique_together = ["lead", "contract_id"]

    def __str__(self):
        return f"{self.lead_id} -> {self.contract_id}"


# ============================================================
# 입찰
# ============================================================
class Tender(models.Model):
    """입찰"""
    STATUS_CHOICES = (
        ("open", "진행중"),
        ("submitted", "제출완료"),
        ("won", "낙찰"),
        ("lost", "탈락"),
        ("closed", "마감"),
    )

    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_tenders",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="tenders",
        verbose_name="영업기회"
    )
    title = models.CharField("입찰명", max_length=200)
    description = models.TextField("설명", blank=True)
    notice_url = models.URLField("공고 URL", blank=True)
    deadline = models.DateTimeField("마감일", null=True, blank=True)
    bond_amount = models.DecimalField(
        "보증금", max_digits=15, decimal_places=0,
        null=True, blank=True
    )
    documents = models.JSONField("제출서류", default=list, blank=True)
    status = models.CharField(
        "상태", max_length=20,
        choices=STATUS_CHOICES, default="open"
    )
    submitted_at = models.DateTimeField("제출일", null=True, blank=True)
    result_note = models.TextField("결과 비고", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "입찰"
        verbose_name_plural = "입찰 목록"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "deadline"]),
        ]

    def __str__(self):
        return self.title


# ============================================================
# 매출 계획 / 수금
# ============================================================
class RevenueMilestone(models.Model):
    """기성/매출 계획"""
    STATUS_CHOICES = (
        ("planned", "계획"),
        ("invoiced", "청구"),
        ("collected", "수금완료"),
    )

    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_revenue_milestones",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="revenue_milestones",
        verbose_name="영업기회"
    )
    contract_id = models.IntegerField("계약 ID", null=True, blank=True)
    title = models.CharField("항목명", max_length=200)
    planned_amount = models.DecimalField(
        "예정금액", max_digits=15, decimal_places=0,
        null=True, blank=True
    )
    planned_date = models.DateField("예정일", null=True, blank=True)
    status = models.CharField(
        "상태", max_length=20,
        choices=STATUS_CHOICES, default="planned"
    )
    notes = models.TextField("비고", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "매출 계획"
        verbose_name_plural = "매출 계획 목록"
        ordering = ["-planned_date", "-created_at"]

    def __str__(self):
        return self.title


class Collection(models.Model):
    """수금/미수"""
    STATUS_CHOICES = (
        ("planned", "예정"),
        ("received", "수금완료"),
        ("overdue", "미수"),
    )

    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_collections",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="collections",
        verbose_name="영업기회"
    )
    milestone = models.ForeignKey(
        RevenueMilestone, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="collections",
        verbose_name="매출 계획"
    )
    amount = models.DecimalField(
        "금액", max_digits=15, decimal_places=0,
        null=True, blank=True
    )
    due_date = models.DateField("수금 예정일", null=True, blank=True)
    received_at = models.DateTimeField("수금일", null=True, blank=True)
    status = models.CharField(
        "상태", max_length=20,
        choices=STATUS_CHOICES, default="planned"
    )
    notes = models.TextField("비고", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "수금"
        verbose_name_plural = "수금 목록"
        ordering = ["-due_date", "-created_at"]

    def __str__(self):
        return f"{self.lead_id or '-'} - {self.amount or 0}"


# ============================================================
# 이메일 템플릿 / 발송 로그
# ============================================================
class EmailTemplate(models.Model):
    """이메일 템플릿"""
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_email_templates",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    name = models.CharField("템플릿명", max_length=100)
    subject = models.CharField("제목", max_length=200)
    body_html = models.TextField("본문(HTML)")
    variables_schema = models.JSONField("변수 스키마", default=dict, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "이메일 템플릿"
        verbose_name_plural = "이메일 템플릿 목록"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class EmailSignature(models.Model):
    """이메일 서명"""
    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_email_signatures",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    name = models.CharField("서명명", max_length=100)
    html = models.TextField("서명 HTML")
    is_default = models.BooleanField("기본 서명", default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "이메일 서명"
        verbose_name_plural = "이메일 서명 목록"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return self.name


class EmailSendLog(models.Model):
    """이메일 발송 로그"""
    STATUS_CHOICES = (
        ("pending", "대기"),
        ("sent", "발송"),
        ("failed", "실패"),
    )

    workspace = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="operation_email_logs",
        verbose_name="워크스페이스(회사)",
        null=True, blank=True,
    )
    lead = models.ForeignKey(
        SalesLead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="email_logs",
        verbose_name="영업기회"
    )
    to = models.CharField("수신자", max_length=255)
    subject = models.CharField("제목", max_length=200)
    body_snapshot = models.TextField("본문 스냅샷")
    status = models.CharField(
        "상태", max_length=20,
        choices=STATUS_CHOICES, default="pending"
    )
    scheduled_at = models.DateTimeField("예약발송일", null=True, blank=True)
    sent_at = models.DateTimeField("발송일", null=True, blank=True)
    error_message = models.TextField("오류 메시지", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name="등록자"
    )
    created_at = models.DateTimeField("등록일", auto_now_add=True)

    class Meta:
        verbose_name = "이메일 발송 로그"
        verbose_name_plural = "이메일 발송 로그 목록"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.to} - {self.subject}"
