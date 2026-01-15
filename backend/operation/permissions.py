# backend/operation/permissions.py
"""
영업관리(Operation) 모듈 - Permissions
"""
from rest_framework import permissions
from django.conf import settings


def is_operation_manager(user):
    if user.is_staff or user.is_superuser:
        return True

    group_names = set(user.groups.values_list("name", flat=True))
    manager_groups = set(
        getattr(
            settings,
            "OPERATION_MANAGER_GROUPS",
            {"sales_manager", "operation_manager", "team_lead", "sales_lead"},
        )
    )
    if group_names & manager_groups:
        return True

    memberships = getattr(user, "memberships", None)
    if memberships is None:
        return False

    membership = (
        memberships.select_related("position").filter(is_primary=True).first()
        or memberships.select_related("position").first()
    )
    position = getattr(membership, "position", None)
    position_name = getattr(position, "name", "") or ""
    lowered = position_name.lower()
    return any(keyword in lowered for keyword in ["manager", "lead", "team", "head"])


class IsLeadOwnerOrAssignee(permissions.BasePermission):
    """
    영업기회의 owner 또는 assignees만 수정 가능.
    관리자는 모든 권한.
    """
    
    def has_object_permission(self, request, view, obj):
        # 읽기 권한은 인증된 사용자 모두에게 허용
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 관리자는 모든 권한
        if request.user.is_staff:
            return True

        if is_operation_manager(request.user):
            return True

        if is_operation_manager(request.user):
            return True

        if is_operation_manager(request.user):
            return True
        
        # owner인 경우
        if obj.owner == request.user:
            return True
        
        # assignees인 경우
        if hasattr(obj, 'assignees') and request.user in obj.assignees.all():
            return True
        
        # 생성자인 경우
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
        
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    작성자만 수정/삭제 가능. 그 외는 읽기만.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if request.user.is_staff:
            return True
        
        # created_by 또는 uploaded_by 필드 확인
        owner = getattr(obj, 'created_by', None) or getattr(obj, 'uploaded_by', None)
        return owner == request.user


class IsRelatedToLead(permissions.BasePermission):
    """
    리드와 관련된 사용자만 접근 가능.
    (Activity, Task, File 등)
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if request.user.is_staff:
            return True
        
        # 관련 리드의 owner/assignees 확인
        lead = getattr(obj, 'lead', None)
        if lead:
            if lead.owner == request.user:
                return True
            if request.user in lead.assignees.all():
                return True
            if lead.created_by == request.user:
                return True
        
        # 직접 작성자인 경우
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
        
        return False


class IsOperationManagerOrReadOnly(permissions.BasePermission):
    """
    Allow read for everyone in workspace, write for managers/admins only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_operation_manager(request.user)
