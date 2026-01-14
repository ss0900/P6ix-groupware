from core.models import Company, UserMembership
from rest_framework.exceptions import PermissionDenied


def get_request_workspace(request):
    """
    Workspace(=Company) 결정 규칙:
    1) Header: X-Company-ID / X-Workspace-ID
    2) Query:  ?workspace= / ?company= / ?company_id=
    3) 없으면: user.memberships 중 primary 우선, 없으면 첫 membership
    """
    company_id = (
        request.headers.get("X-Company-ID")
        or request.headers.get("X-Workspace-ID")
        or request.query_params.get("workspace")
        or request.query_params.get("company")
        or request.query_params.get("company_id")
    )

    memberships = UserMembership.objects.filter(user=request.user).select_related("company")

    # 1) explicit company_id
    if company_id:
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            raise PermissionDenied("Workspace(Company)를 찾을 수 없습니다.")

        # superuser/staff는 통과, 일반 사용자는 membership 확인
        if not (request.user.is_staff or request.user.is_superuser):
            if not memberships.filter(company=company).exists():
                raise PermissionDenied("해당 Workspace(Company)에 대한 접근 권한이 없습니다.")
        return company

    # 2) primary membership fallback
    primary = memberships.filter(is_primary=True).first()
    if primary:
        return primary.company

    any_mem = memberships.first()
    if any_mem:
        return any_mem.company

    raise PermissionDenied("Workspace(Company) 소속이 없습니다. 관리자에게 문의하세요.")