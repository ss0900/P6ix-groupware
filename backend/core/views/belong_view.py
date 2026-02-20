import os

from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.models import Company, Department, Position, UserMembership, Organization, CustomUser
from core.serializers import CompanySerializer, DepartmentSerializer, PositionSerializer, OrganizationSerializer


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

    @action(detail=False, methods=["get"], url_path="org-chart")
    def org_chart(self, request):
        user = request.user

        if user.is_superuser:
            allowed_company_ids = list(
                Company.objects.all().values_list("id", flat=True)
            )
        else:
            allowed_company_ids = _get_user_company_ids(user)

        company_param = request.query_params.get("company")
        selected_company_id = None

        if company_param:
            try:
                selected_company_id = int(company_param)
            except (TypeError, ValueError):
                return Response({"error": "company 파라미터가 유효하지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)

            if selected_company_id not in allowed_company_ids:
                raise PermissionDenied("해당 회사 데이터에 접근할 권한이 없습니다.")

            target_company_ids = [selected_company_id]
        else:
            target_company_ids = allowed_company_ids

        companies_qs = Company.objects.filter(id__in=allowed_company_ids).order_by("name")
        departments_qs = (
            Department.objects.filter(company_id__in=target_company_ids)
            .select_related("company", "parent")
            .order_by("company__name", "name")
        )
        memberships_qs = (
            UserMembership.objects.filter(company_id__in=target_company_ids)
            .select_related("user", "company", "department", "position")
            .order_by("company__name", "-is_primary", "position__level", "user__last_name", "user__first_name")
        )

        companies = [{"id": company.id, "name": company.name} for company in companies_qs]
        departments = [
            {
                "id": dept.id,
                "name": dept.name,
                "type": dept.type,
                "company": dept.company_id,
                "company_name": dept.company.name if dept.company else "",
                "parent": dept.parent_id,
            }
            for dept in departments_qs
        ]
        members = []

        for membership in memberships_qs:
            if not membership.user:
                continue

            full_name = f"{membership.user.last_name}{membership.user.first_name}".strip()
            members.append(
                {
                    "id": membership.id,
                    "user_id": membership.user_id,
                    "name": full_name or membership.user.username,
                    "username": membership.user.username,
                    "phone_number": membership.user.phone_number,
                    "email": membership.user.email,
                    "company_id": membership.company_id,
                    "company_name": membership.company.name if membership.company else "",
                    "department_id": membership.department_id,
                    "department_name": membership.department.name if membership.department else "",
                    "position_id": membership.position_id,
                    "position_name": membership.position.name if membership.position else "",
                    "position_level": membership.position.level if membership.position else None,
                    "is_primary": membership.is_primary,
                }
            )

        return Response(
            {
                "companies": companies,
                "current_company": selected_company_id,
                "departments": departments,
                "members": members,
            },
            status=status.HTTP_200_OK,
        )


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.select_related("company").all().order_by("company__name")
    serializer_class = OrganizationSerializer
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

    def _build_profile_picture_url(self, user):
        if not user.profile_picture:
            return None
        request = self.request
        return request.build_absolute_uri(user.profile_picture.url) if request else user.profile_picture.url

    def _enrich_tree_with_user_info(self, tree):
        if not isinstance(tree, dict):
            return tree

        def enrich_node(node):
            if not isinstance(node, dict):
                return node

            user_id = node.get("user_id")
            if user_id:
                try:
                    user = CustomUser.objects.get(pk=user_id)
                    node["profile_picture_url"] = self._build_profile_picture_url(user)
                    node["user_name"] = (
                        f"{user.last_name or ''}{user.first_name or ''}".strip() or user.username
                    )
                    node["user_phone"] = user.phone_number or ""

                    primary_membership = (
                        UserMembership.objects.filter(user=user, is_primary=True)
                        .select_related("company", "position")
                        .first()
                    )
                    membership = primary_membership or (
                        UserMembership.objects.filter(user=user)
                        .select_related("company", "position")
                        .first()
                    )
                    node["user_company"] = membership.company.name if membership and membership.company else ""
                    node["user_position"] = membership.position.name if membership and membership.position else ""
                except CustomUser.DoesNotExist:
                    node["profile_picture_url"] = None
                    node["user_name"] = None
                    node["user_phone"] = None
                    node["user_company"] = None
                    node["user_position"] = None

            children = node.get("children", [])
            if isinstance(children, list):
                node["children"] = [enrich_node(child) for child in children]

            return node

        return enrich_node(tree)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = serializer.data
            for item in data:
                if item.get("tree"):
                    item["tree"] = self._enrich_tree_with_user_info(item["tree"])
            return self.get_paginated_response(data)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        for item in data:
            if item.get("tree"):
                item["tree"] = self._enrich_tree_with_user_info(item["tree"])
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        if data.get("tree"):
            data["tree"] = self._enrich_tree_with_user_info(data["tree"])
        return Response(data)

    @action(detail=False, methods=["get"], url_path="available-users")
    def available_users(self, request):
        company_param = request.query_params.get("company")
        if not company_param:
            return Response({"error": "company 파라미터가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company_id = int(company_param)
        except (TypeError, ValueError):
            return Response({"error": "company 파라미터가 유효하지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)

        self._ensure_company_permission(company_id)

        memberships_qs = (
            UserMembership.objects.filter(company_id=company_id)
            .select_related("user", "company", "position")
            .order_by("-is_primary", "position__level", "user__last_name", "user__first_name")
        )

        rows = []
        seen_user_ids = set()
        for membership in memberships_qs:
            user = membership.user
            if not user or user.id in seen_user_ids:
                continue

            seen_user_ids.add(user.id)
            rows.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "phone_number": user.phone_number,
                    "company": membership.company.name if membership.company else "",
                    "position": membership.position.name if membership.position else "",
                    "profile_picture": self._build_profile_picture_url(user),
                }
            )

        return Response(rows, status=status.HTTP_200_OK)

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
from rest_framework import serializers as drf_serializers

class UserListSerializer(drf_serializers.ModelSerializer):
    company = drf_serializers.SerializerMethodField()
    department = drf_serializers.SerializerMethodField()
    position = drf_serializers.SerializerMethodField()
    company_id = drf_serializers.SerializerMethodField()
    department_id = drf_serializers.SerializerMethodField()
    position_id = drf_serializers.SerializerMethodField()
    profile_picture = drf_serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "first_name", "last_name", "phone_number",
            "is_active", "is_staff", "is_superuser",
            "company", "company_id", "department", "department_id", "position", "position_id",
            "profile_picture",
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

    def get_profile_picture(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url


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
        # company가 명시적으로 null/빈값이면 주 소속 해제(멤버십 삭제)
        if "company" in data:
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
            else:
                UserMembership.objects.filter(user=user, is_primary=True).delete()

        return Response(UserListSerializer(user).data)
