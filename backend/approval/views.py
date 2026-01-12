# backend/approval/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import DocumentTemplate, Document, ApprovalLine, ApprovalAction
from .serializers import (
    DocumentTemplateSerializer,
    DocumentListSerializer, DocumentDetailSerializer, 
    DocumentCreateSerializer, DocumentSubmitSerializer,
    ApprovalDecisionSerializer, ApprovalActionSerializer
)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """결재 양식 ViewSet"""
    queryset = DocumentTemplate.objects.filter(is_active=True)
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsAuthenticated]


class DocumentViewSet(viewsets.ModelViewSet):
    """결재 문서 ViewSet"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        filter_type = self.request.query_params.get("filter", "all")

        qs = Document.objects.select_related("author", "template").prefetch_related("approval_lines")

        if filter_type == "draft":
            # 내가 작성한 임시저장
            qs = qs.filter(author=user, status="draft")
        elif filter_type == "sent":
            # 내가 기안한 문서
            qs = qs.filter(author=user).exclude(status="draft")
        elif filter_type == "pending":
            # 내가 결재할 문서
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__status="pending"
            )
        elif filter_type == "approved":
            # 내가 결재한 문서
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__status__in=["approved", "rejected"]
            )
        elif filter_type == "reference":
            # 참조 문서
            qs = qs.filter(
                approval_lines__approver=user,
                approval_lines__approval_type="reference"
            )
        else:
            # 전체 (내가 관련된 문서)
            qs = qs.filter(
                Q(author=user) | Q(approval_lines__approver=user)
            )

        return qs.distinct().order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        elif self.action == "create":
            return DocumentCreateSerializer
        return DocumentDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """문서 제출 (기안)"""
        document = self.get_object()
        
        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 제출할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if document.status != "draft":
            return Response(
                {"error": "임시저장 상태의 문서만 제출할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DocumentSubmitSerializer(
            document, data={}, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "문서가 제출되었습니다."})

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        """결재 결정 (승인/반려)"""
        document = self.get_object()

        serializer = ApprovalDecisionSerializer(
            document, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        action_text = "승인" if request.data.get("action") == "approve" else "반려"
        return Response({"message": f"문서가 {action_text}되었습니다."})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """문서 취소 (회수)"""
        document = self.get_object()

        if document.author != request.user:
            return Response(
                {"error": "문서 작성자만 취소할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN
            )

        if document.status not in ["draft", "pending"]:
            return Response(
                {"error": "임시저장 또는 결재 중 상태의 문서만 취소할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        document.status = "canceled"
        document.save()

        ApprovalAction.objects.create(
            document=document,
            actor=request.user,
            action="cancel",
            comment=request.data.get("comment", "")
        )

        return Response({"message": "문서가 취소되었습니다."})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """결재 통계"""
        user = request.user

        pending_count = Document.objects.filter(
            approval_lines__approver=user,
            approval_lines__status="pending"
        ).distinct().count()

        draft_count = Document.objects.filter(
            author=user, status="draft"
        ).count()

        sent_count = Document.objects.filter(
            author=user
        ).exclude(status="draft").count()

        return Response({
            "pending": pending_count,
            "draft": draft_count,
            "sent": sent_count,
        })
