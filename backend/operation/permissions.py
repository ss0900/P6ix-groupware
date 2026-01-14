# backend/operation/permissions.py
"""
영업관리(Operation) 모듈 - Permissions
"""
from rest_framework import permissions


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
