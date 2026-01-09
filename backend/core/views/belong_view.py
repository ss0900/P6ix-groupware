import os

from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import Company, Department, Position, UserMembership
from core.serializers import CompanySerializer, DepartmentSerializer, PositionSerializer

# 회사 관리
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()

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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'type', 'company__name']
    
    def get_queryset(self):
        # 기본 queryset (= self.queryset) 위에 조건만 얹음
        qs = super().get_queryset()

        company_id = self.request.query_params.get('company')

        if company_id:
            qs = qs.filter(company_id=company_id)

        return qs

# 직급 관리
class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all().order_by('level','name')
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # def get_queryset(self):
    #     qs = super().get_queryset()
    #     project_id   = self.request.query_params.get('project')
    #     if project_id:
    #         qs = qs.filter(
    #             usermembership__company__project_participations__project_id=project_id
    #         ).distinct()
    #     return qs