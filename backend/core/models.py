from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
from django.db import models
from django.db.models import Q

# 사용자 매니저
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('이메일은 필수입니다')
        if not password:
            raise ValueError('비밀번호는 필수입니다')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)

# 사용자 모델
class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=20, null=False, blank=False, verbose_name="전화번호")
    sign_file = models.FileField(upload_to='usersign/', null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile/', null=True, blank=True, verbose_name="프로필 사진")

    objects = CustomUserManager()

    REQUIRED_FIELDS = ['email', 'phone_number']

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자 목록"

# 회사(법인) 정보
class Company(models.Model):
    id = models.AutoField(primary_key=True)                                     # 회사 ID
    name = models.CharField(max_length=255, verbose_name="회사명")               # 회사명
    registration_no = models.CharField(max_length=30, null=True, blank=True, verbose_name="사업자등록번호")
    address = models.CharField(max_length=100, verbose_name="주소")
    detail_address = models.CharField(max_length=100, null=True, blank=True, verbose_name="상세 주소")
    extra_address = models.CharField(max_length=100, null=True, blank=True, verbose_name="추가 주소")
    phone = models.CharField(max_length=30, null=True, blank=True, verbose_name="전화번호")
    email = models.EmailField(max_length=254, null=True, blank=True, verbose_name="이메일")
    logo = models.ImageField(upload_to='company/logo/', null=True, blank=True, verbose_name="회사 로고")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        verbose_name = "회사"
        verbose_name_plural = "회사 목록"
        
    def __str__(self):
        return self.name

# 부서/조직
class Department(models.Model):
    id = models.AutoField(primary_key=True)                                     # 부서 ID
    company = models.ForeignKey(Company, on_delete=models.CASCADE)              # 소속 회사 ID
    name = models.CharField(max_length=255, verbose_name="부서명")               # 부서팀명
    type = models.CharField(max_length=50, null=True, blank=True, verbose_name="부서 구분")  # 본사/현장/TF 등 구분
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True)    # 상위 부서 ID 없으면 null
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        verbose_name = "부서"
        verbose_name_plural = "부서 목록"
        ordering = ["company_id", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name", "parent"],
                name="uniq_company_parent_dept_name",
            ),
        ]
        
    def __str__(self):
        comp_name = self.company.name if getattr(self, "company", None) else None
        return f"{comp_name} - {self.name}" if comp_name else self.name

# 직위/직급
class Position(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="positions")
    name = models.CharField(max_length=100, verbose_name="직위명")
    level = models.IntegerField(null=True, blank=True, verbose_name="직급 레벨")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        verbose_name = "직위"
        verbose_name_plural = "직위 목록"
        ordering = ["company_id", "level", "name"]
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="uniq_company_position_name"),
        ]

    def __str__(self):
        comp_name = self.company.name if getattr(self, "company", None) else None
        return f"{comp_name} - {self.name}" if comp_name else self.name

    def save(self, *args, **kwargs):
        """
        level이 비어있으면 해당 회사의 최대 level+1을 자동 부여
        """
        if self.level is None:
            last = Position.objects.filter(company=self.company).order_by("-level").first()
            self.level = (last.level + 1) if last and last.level is not None else 1
        super().save(*args, **kwargs)

# 사용자 소속(멤버쉽)
class UserMembership(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="memberships")
    company = models.ForeignKey(Company, on_delete=models.PROTECT)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True)
    is_primary = models.BooleanField(default=False, verbose_name="주 소속 여부")   # 1=주 소속
    started_on = models.DateField(null=True, blank=True, verbose_name="시작일")
    ended_on = models.DateField(null=True, blank=True, verbose_name="종료일")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")

    class Meta:
        verbose_name = "사용자 소속"
        verbose_name_plural = "사용자 소속 목록"
        constraints = [
            # 한 사용자에게 주 소속(is_primary=True)은 1개만
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_primary=True),
                name="uniq_user_primary_membership",
            ),
        ]


class Organization(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="organizations",
        verbose_name="회사",
    )
    tree = models.JSONField(null=True, blank=True, verbose_name="조직도")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        verbose_name = "조직도"
        verbose_name_plural = "조직도"
        constraints = [
            models.UniqueConstraint(
                fields=["company"],
                name="uniq_company_organization",
            ),
        ]
        indexes = [
            models.Index(fields=["company"], name="org_company_idx"),
        ]

    def __str__(self):
        return f"{self.company_id} 조직도"
