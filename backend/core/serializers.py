from django.db import transaction
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser, UserMembership, Company, Department, Position, Organization
import os                             
from django.utils import timezone

# 사용자 정보
class UserSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile_picture_file = serializers.ImageField(write_only=True, required=False, allow_null=True)
    clear_sign = serializers.BooleanField(write_only=True, required=False, default=False)

    profile_picture = serializers.SerializerMethodField()  # 🔥 추가

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "phone_number",
            "first_name", "last_name",
            "current_password", "password",
            "profile_picture_file", "clear_sign",
            "sign_file", "profile_picture",  # 🔥 응답 포함
            "is_superuser", # 🔥 Admin 판단용
            "is_staff",
        ]
        read_only_fields = ["id", "username", "is_superuser", "is_staff"]

    def get_profile_picture(self, obj):   # 🔥 반드시 이 함수 있어야 함
        if not obj.profile_picture:
            return None

        request = self.context.get("request")
        try:
            ts = int(os.path.getmtime(obj.profile_picture.path))
        except:
            ts = int(timezone.now().timestamp())

        url = f"{obj.profile_picture.url}?t={ts}"
        return request.build_absolute_uri(url) if request else url

    def validate(self, attrs):
        user = self.instance
        current = attrs.get("current_password")
        new_pw = attrs.get("password")

        # ① 현재 비밀번호만 보낸 경우(인증만): 맞는지만 확인
        only_verify = current and not any(k in attrs for k in ["email", "phone_number", "password"])
        if only_verify:
            if not user.check_password(current):
                raise serializers.ValidationError({"current_password": "현재 비밀번호가 올바르지 않습니다."})
            return attrs

        # ② 비번 변경 요청이면 현재 비번 필수 + 검증
        if new_pw:
            if not current:
                raise serializers.ValidationError({"current_password": "비밀번호 변경 시 현재 비밀번호가 필요합니다."})
            if not user.check_password(current):
                raise serializers.ValidationError({"current_password": "현재 비밀번호가 올바르지 않습니다."})

        return attrs

    def update(self, instance, validated_data):
        # 인증만: 아무 것도 안 바꾸고 반환
        only_verify = (
            "current_password" in validated_data and
            not any(
                k in validated_data
                for k in [
                    "email",
                    "phone_number",
                    "first_name",
                    "last_name",
                    "password",
                    "profile_picture_file",
                    "sign_file",
                    "clear_sign",
                ]
            )
        )
        if only_verify:
            return instance

        # serializer 전용 필드 분리
        validated_data.pop("current_password", None)
        profile_picture_file = validated_data.pop("profile_picture_file", None)
        clear_sign = validated_data.pop("clear_sign", False)
        sign_file = validated_data.pop("sign_file", None)

        # 프로필 변경
        email = validated_data.get("email")
        phone = validated_data.get("phone_number")
        first_name = validated_data.get("first_name")
        last_name = validated_data.get("last_name")
        if email is not None:
            instance.email = email
        if phone is not None:  
            instance.phone_number = phone
        if first_name is not None:
            instance.first_name = first_name
        if last_name is not None:
            instance.last_name = last_name

        # 비번 변경
        new_pw = validated_data.get("password")
        if new_pw:
            instance.set_password(new_pw)

        if profile_picture_file is not None:
            instance.profile_picture = profile_picture_file

        if sign_file is not None:
            instance.sign_file = sign_file

        if clear_sign:
            if instance.sign_file:
                instance.sign_file.delete(save=False)
            instance.sign_file = None

        instance.save()
        return instance

# 로그인
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        if username and password:
            user = authenticate(request=self.context.get('request'),
                                 username=username,
                                 password=password)
            if not user:
                raise serializers.ValidationError("아이디 또는 비밀번호가 올바르지 않습니다.", code='authorization')
        else:
            raise serializers.ValidationError("아이디와 비밀번호를 모두 입력해주세요.", code='authorization')
        attrs['user'] = user
        return attrs
    
    def create(self, validated_data):
        """
        JWT 토큰 발급 + 회사/부서/직위 정보 포함
        """
        user = validated_data["user"]
        refresh = RefreshToken.for_user(user)

        # 🔥 1) 사용자 소속(UserMembership) 선택 (주 소속 우선)
        memberships = getattr(user, "memberships", None)
        membership = (
            memberships
            .select_related("company", "department", "position")
            .filter(is_primary=True)
            .first()
            or
            memberships
            .select_related("company", "department", "position")
            .first()
        ) if memberships is not None else None

        # membership이 없을 수 있으므로 None 체크
        company = membership.company if membership and membership.company else None
        department = membership.department if membership and membership.department else None
        position = membership.position if membership and membership.position else None

        return {
            'user': {
                'id': user.id,
                'name': f'{user.last_name}{user.first_name}',
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,

                # 🔥 회사 정보
                'company_id': company.id if company else None,
                'company': company.name if company else None,

                # 🔥 부서 정보
                'department_id': department.id if department else None,
                'department': department.name if department else None,

                # 🔥 직위 정보
                'position_id': position.id if position else None,
                'position': position.name if position else None,

                'sign': user.sign_file.url if user.sign_file else None,
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

# 로그아웃
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        if not value:
            raise serializers.ValidationError("Refresh 토큰이 필요합니다.")
        return value

# 회사
class CompanySerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ["id", "name", "registration_no", "address", "detail_address",
                  "extra_address", "phone", "email", "logo", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
        
    def get_logo(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        try:
            ts = int(os.path.getmtime(obj.logo.path))
        except:
            ts = int(timezone.now().timestamp())
        url = f"{obj.logo.url}?t={ts}"
        return request.build_absolute_uri(url) if request else url

# 부서
class DepartmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "company", "company_name", "name", "order", "type", "parent",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class OrganizationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "company",
            "company_name",
            "tree",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "company_name"]

# 직급
class PositionSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), write_only=True, required=True
    )
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id", "name", "level",
            "company",           
            "company_id", "company_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "company_id", "company_name"]

# 유저 멤버십 조회
class UserMembershipReadSerializer(serializers.ModelSerializer):
    company_name    = serializers.CharField(source="company.name", read_only=True)
    company_logo    = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_name   = serializers.CharField(source="position.name", read_only=True)

    def get_company_logo(self, obj):
        company = getattr(obj, "company", None)
        if not company or not company.logo:
            return None
        request = self.context.get("request")
        try:
            ts = int(os.path.getmtime(company.logo.path))
        except Exception:
            ts = int(timezone.now().timestamp())
        url = f"{company.logo.url}?t={ts}"
        return request.build_absolute_uri(url) if request else url

    class Meta:
        model = UserMembership
        fields = [
            "id",
            "company", "company_name", "company_logo",
            "department", "department_name",
            "position", "position_name",
            "is_primary",
            "started_on", "ended_on",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "company_name",
            "company_logo",
            "department_name",
            "position_name",
        ]

# --- 멤버십 쓰기용 (회사/부서/직위 변경·생성) ---
class UserMembershipWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMembership
        fields = ["company", "department", "position", "is_primary", "started_on", "ended_on"]

    def validate(self, attrs):
        # 회사는 필수(정책에 맞게 조정)
        if not attrs.get("company") and not getattr(self.instance, "company", None):
            raise serializers.ValidationError({"company": "회사 선택은 필수입니다."})
        started_on = attrs.get("started_on", getattr(self.instance, "started_on", None))
        ended_on = attrs.get("ended_on", getattr(self.instance, "ended_on", None))
        if started_on and ended_on and ended_on < started_on:
            raise serializers.ValidationError({"ended_on": "종료일은 시작일 이후여야 합니다."})
        return attrs

    def save(self, **kwargs):
        """
        - 생성 시: user는 request.user로 강제 주입
        - is_primary=True로 저장되면 나머지 멤버십은 모두 is_primary=False로 정리
        """
        user = kwargs.get("user") or (self.instance.user if self.instance else None)
        if user is None:
            raise serializers.ValidationError("user가 필요합니다.")

        instance = super().save(user=user, **kwargs)

        # 주 소속 정리: 한 명에게 하나만 유지
        if instance.is_primary:
            UserMembership.objects.filter(user=user).exclude(pk=instance.pk).update(is_primary=False)

        return instance
