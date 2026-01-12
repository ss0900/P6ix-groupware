# backend/operation/models.py
from django.db import models
from django.conf import settings


class Client(models.Model):
    """거래처/고객사"""
    name = models.CharField("회사명", max_length=200)
    representative = models.CharField("대표자", max_length=100, blank=True)
    business_number = models.CharField("사업자번호", max_length=20, blank=True)
    industry = models.CharField("업종", max_length=100, blank=True)
    
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
    
    title = models.CharField("견적 제목", max_length=200)
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default="draft")
    
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
        return f"{self.estimate_number} - {self.title}"


class EstimateItem(models.Model):
    """견적 항목"""
    estimate = models.ForeignKey(
        Estimate, on_delete=models.CASCADE,
        related_name="items", verbose_name="견적"
    )
    description = models.CharField("품목", max_length=200)
    quantity = models.PositiveIntegerField("수량", default=1)
    unit_price = models.DecimalField("단가", max_digits=15, decimal_places=0, default=0)
    amount = models.DecimalField("금액", max_digits=15, decimal_places=0, default=0)
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
