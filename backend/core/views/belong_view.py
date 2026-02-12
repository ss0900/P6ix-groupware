import os

from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.models import Company, Department, Position, UserMembership
from core.serializers import CompanySerializer, DepartmentSerializer, PositionSerializer


def _get_user_company_ids(user):
    return list(
        UserMembership.objects.filter(user=user)
        .values_list("company_id", flat=True)
        .distinct()
    )


class IsSuperuserOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsStaffOrSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )

# 회사 관리
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "upload_logo"]:
            permission_classes = [permissions.IsAuthenticated, IsSuperuserOnly]
        else:
            permission_classes = [permissions.IsAuthenticated, IsStaffOrSuperuser]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            company_ids = _get_user_company_ids(user)
            qs = qs.filter(id__in=company_ids)

        # 검색어 필터 (회사명, 사업자등록번호, 이메일, 전화번호 등)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(registration_no__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        resp = serializer.data
        has_active_membership = UserMembership.objects.filter(user=request.user).exists()

        resp["_membership_prompt"] = {
            "should_prompt": not has_active_membership,
            "user_id": request.user.id,
            "company_id": company.id,
        }
        return Response(resp, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="upload-logo")
    def upload_logo(self, request, pk=None):
        company = self.get_object()
        file_obj = request.FILES.get("file") or request.FILES.get("logo")
        
        if not file_obj:
            return Response({"error": "파일이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 지원하지 않는 이미지 형식 체크
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            return Response({"error": f"지원하지 않는 이미지 형식({ext})입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 기존 로고 파일 삭제 (동일 파일명 충돌 방지 및 용량 관리)
        if company.logo:
            try:
                # 필드를 통해 파일 경로를 가져올 때 파일이 실제 존재하지 않을 수 있으므로 체크
                if company.logo.path and os.path.isfile(company.logo.path):
                    os.remove(company.logo.path)
            except Exception as e:
                print(f"기존 로고 삭제 중 오류 발생: {e}")

        try:
            # 새 로고 저장
            filename = f"company_logo_{company.id}{ext}"
            company.logo.save(filename, file_obj, save=True)
            
            # 시리얼라이저를 통해 절대 경로 URL 반환
            logo_url = self.get_serializer(company, context={"request": request}).data.get("logo")
            
            return Response({
                "success": True,
                "logo_url": logo_url
            })
        except Exception as e:
            return Response({"error": f"저장 중 오류 발생: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 부서 관리
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('company', 'parent').all().order_by('company__name','name')
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrSuperuser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'type', 'company__name']

    def _ensure_company_permission(self, company_id):
        if self.request.user.is_superuser:
            return
        if company_id not in _get_user_company_ids(self.request.user):
            raise PermissionDenied("해당 회사 데이터에 접근할 권한이 없습니다.")
    
    def get_queryset(self):
        # 기본 queryset (= self.queryset) 위에 조건만 얹음
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            company_ids = _get_user_company_ids(user)
            qs = qs.filter(company_id__in=company_ids)

        company_id = self.request.query_params.get('company')

        if company_id:
            qs = qs.filter(company_id=company_id)

        return qs

    def perform_create(self, serializer):
        company = serializer.validated_data.get("company")
        if company:
            self._ensure_company_permission(company.id)
        serializer.save()

    def perform_update(self, serializer):
        company = serializer.validated_data.get("company") or serializer.instance.company
        if company:
            self._ensure_company_permission(company.id)
        serializer.save()

# 직급 관리
class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all().order_by('level','name')
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrSuperuser]
    
    def _ensure_company_permission(self, company_id):
        if self.request.user.is_superuser:
            return
        if company_id not in _get_user_company_ids(self.request.user):
            raise PermissionDenied("해당 회사 데이터에 접근할 권한이 없습니다.")

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            company_ids = _get_user_company_ids(user)
            qs = qs.filter(company_id__in=company_ids)

        company_id = self.request.query_params.get("company")
        if company_id:
            qs = qs.filter(company_id=company_id)

        return qs

    def perform_create(self, serializer):
        company = serializer.validated_data.get("company")
        if company:
            self._ensure_company_permission(company.id)
        serializer.save()

    def perform_update(self, serializer):
        company = serializer.validated_data.get("company") or serializer.instance.company
        if company:
            self._ensure_company_permission(company.id)
        serializer.save()
    
    # def get_queryset(self):
    #     qs = super().get_queryset()
    #     project_id   = self.request.query_params.get('project')
    #     if project_id:
    #         qs = qs.filter(
    #             usermembership__company__project_participations__project_id=project_id
    #         ).distinct()
    #     return qs


# 사용자 관리
from core.models import CustomUser
from rest_framework import serializers as drf_serializers

class UserListSerializer(drf_serializers.ModelSerializer):
    company = drf_serializers.SerializerMethodField()
    department = drf_serializers.SerializerMethodField()
    position = drf_serializers.SerializerMethodField()
    company_id = drf_serializers.SerializerMethodField()
    department_id = drf_serializers.SerializerMethodField()
    position_id = drf_serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "first_name", "last_name", "phone_number",
            "is_active", "is_staff", "is_superuser",
            "company", "company_id", "department", "department_id", "position", "position_id"
        ]

    def _get_primary_membership(self, obj):
        return obj.memberships.filter(is_primary=True).select_related("company", "department", "position").first()

    def get_company(self, obj):
        m = self._get_primary_membership(obj)
        return {"id": m.company.id, "name": m.company.name} if m and m.company else None
    
    def get_company_id(self, obj):
        m = self._get_primary_membership(obj)
        return m.company.id if m and m.company else None

    def get_department(self, obj):
        m = self._get_primary_membership(obj)
        return {"id": m.department.id, "name": m.department.name} if m and m.department else None

    def get_department_id(self, obj):
        m = self._get_primary_membership(obj)
        return m.department.id if m and m.department else None

    def get_position(self, obj):
        m = self._get_primary_membership(obj)
        return {"id": m.position.id, "name": m.position.name} if m and m.position else None

    def get_position_id(self, obj):
        m = self._get_primary_membership(obj)
        return m.position.id if m and m.position else None


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.prefetch_related("memberships").all().order_by("-date_joined")
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperuserOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        user = CustomUser.objects.create_user(
            username=data.get("username"),
            email=data.get("email"),
            password=data.get("password"),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            phone_number=data.get("phone_number", ""),
            is_staff=data.get("is_staff", False),
            is_active=data.get("is_active", True),
        )
        
        # 소속 생성
        company_id = data.get("company")
        if company_id:
            UserMembership.objects.create(
                user=user,
                company_id=company_id,
                department_id=data.get("department") or None,
                position_id=data.get("position") or None,
                is_primary=True
            )
        
        return Response(UserListSerializer(user).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data

        # 기본 정보 업데이트
        for field in ["email", "first_name", "last_name", "phone_number", "is_staff", "is_active"]:
            if field in data:
                setattr(user, field, data[field])
        
        if data.get("password"):
            user.set_password(data["password"])
        
        user.save()

        # 소속 업데이트
        company_id = data.get("company")
        if company_id:
            membership, _ = UserMembership.objects.get_or_create(
                user=user, is_primary=True,
                defaults={"company_id": company_id}
            )
            membership.company_id = company_id
            membership.department_id = data.get("department") or None
            membership.position_id = data.get("position") or None
            membership.save()

        return Response(UserListSerializer(user).data)
